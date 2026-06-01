const db = require("../config/db");
const generateVoucherNumber = require("../utils/generateVoucherNumber");
exports.createJournal = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      company_id,
      voucher_no,
      voucher_date,
      narration,
      party_id,
      group_ledger_id,
      group_name,
      item_name,
      amount,
      paid,
      payment_type,
      payment_mode,
      bank_id,
      cheque_number,
      cheque_date,
      
    } = req.body;

    if (!company_id) throw new Error("company_id missing");

    if (!party_id || !group_ledger_id)
      throw new Error("Required fields missing");

    const finalAmount = Number(amount || 0);
    const finalPaid = Number(paid || 0);
    const finalDue = finalAmount - finalPaid;
    const payType = payment_type || "none";

    await conn.beginTransaction();

    // 🔥 VALIDATION BEFORE INSERT
    if (payment_mode === "CHEQUE") {
      if (!bank_id || !cheque_number || !cheque_date) {
        throw new Error("Cheque details required");
      }
    }

    if (
      payment_mode &&
      payment_mode !== "CASH" &&
      payment_mode !== "CHEQUE" &&
      !bank_id
    ) {
      throw new Error("Bank required for this payment mode");
    }

    // 🔥 AUTO GENERATE JOURNAL VOUCHER NUMBER
    const finalVoucherNo = await generateVoucherNumber(
      conn,
      company_id,
      "JOURNAL_VOUCHER",
    );

    // ✅ GET LEDGER ID & NUMBER (PARTY)
    const [[ledger]] = await conn.query(
      `
  SELECT id, ledger_number 
  FROM ledgers 
  WHERE party_id = ? 
  AND company_id = ?
  LIMIT 1
  `,
      [Number(party_id), Number(company_id)],
    );

    const ledger_id = ledger?.id || null;
    const ledger_number = ledger?.ledger_number || null;

    console.log("JOURNAL LEDGER:", ledger_id, ledger_number);

    /* ---- Journal Header ---- */

    const [jv] = await conn.query(
      `
      INSERT INTO jurnal_voucher
      (company_id, party_id,ledger_number, group_id, group_name,
       voucher_no, voucher_date, narration, item_name,
       amount, paid, due, payment_type, payment_mode, bank_id, cheque_number, cheque_date,status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?,'active')
      `,
      [
        company_id,
        party_id,
        ledger_number,
        group_ledger_id,
        group_name,
        finalVoucherNo,
        voucher_date,
        narration,
        item_name || null,
        finalAmount,
        finalPaid,
        finalDue,
        payType,
        // 🔥 NEW
        payment_mode || null,
        bank_id || null,
        cheque_number || null,
        cheque_date || null,
      ],
    );

    await conn.execute(
      `
  INSERT INTO ledger_entries
  (company_id, entry_date, source_type, source_id,
   ledger_id, party_id, debit, credit, narration)
  VALUES (?, ?, 'JOURNAL', ?, ?, ?, ?, 0, ?)
  `,
      [
        company_id,
        voucher_date,
        finalVoucherNo,
        ledger_id,
        party_id,
        finalAmount,
        narration || "Journal Entry",
      ],
    );

    /* ---- Group Ledger Cr ---- */
    await conn.execute(
      `
  INSERT INTO ledger_entries
  (company_id, entry_date, source_type, source_id,
   ledger_id, debit, credit, narration)
  VALUES (?, ?, 'JOURNAL', ?, ?, 0, ?, ?)
  `,
      [
        company_id,
        voucher_date,
        finalVoucherNo,
        group_ledger_id,
        finalAmount,
        narration || "Journal Entry",
      ],
    );

    /* ---- Receipt Entry (IF PAID) ---- */
    if (finalPaid > 0 && payType !== "none") {
      // Party CR (Payment received/made against party)
      await conn.execute(
        `
  INSERT INTO ledger_entries
  (company_id, entry_date, source_type, source_id,
   ledger_id, party_id, debit, credit, narration)
  VALUES (?, ?, 'RECEIPT', ?, ?, ?, 0, ?, ?)
  `,
        [
          company_id,
          voucher_date,
          finalVoucherNo,
          ledger_id,
          party_id,
          finalPaid,
          "Receipt against journal",
        ],
      );
    }

    await conn.commit();
    res.json({
      success: true,
      finalVoucherNo,
      message: "Journal created perfectly ✅",
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
};

exports.updateJournal = async (req, res) => {
  const journalId = req.params.id;
  const conn = await db.getConnection();

  try {
    const {
      company_id,
      voucher_date,
      narration,
      party_id,
      group_id,
      group_name,
      item_name,
      amount = 0,
      paid = 0,
      payment_type = "none",
      payment_mode,
      bank_id,
      cheque_number,
      cheque_date,
    } = req.body;

    if (!company_id) throw new Error("company_id missing");

    const finalAmount = Number(amount);
    const finalPaid = Number(paid);
    const finalDue = finalAmount - finalPaid;

    await conn.beginTransaction();

    // 🔥 VALIDATION BEFORE INSERT
    if (payment_mode === "CHEQUE") {
      if (!bank_id || !cheque_number || !cheque_date) {
        throw new Error("Cheque details required");
      }
    }

    if (
      payment_mode &&
      payment_mode !== "CASH" &&
      payment_mode !== "CHEQUE" &&
      !bank_id
    ) {
      throw new Error("Bank required for this payment mode");
    }

    /* 1️⃣ Old journal */
    const [[old]] = await conn.query(
      `SELECT voucher_no, party_id, group_id, voucher_date
       FROM jurnal_voucher
      WHERE id=? AND company_id=? AND status='active'`,
      [journalId, company_id],
    );

    if (!old) throw new Error("Journal not found");

    const [[ledger]] = await conn.query(
      `SELECT id, ledger_number FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1`,
      [Number(party_id || old.party_id), Number(company_id)],
    );
    const ledger_id = ledger?.id || null;

    const voucher_no = old.voucher_no;
    const finalPartyId = party_id ?? old.party_id;
    const finalGroupId = group_id ?? old.group_id;
    const finalDate = voucher_date ?? old.voucher_date;

    /* 2️⃣ Update journal header */
    await conn.query(
      `
      UPDATE jurnal_voucher
      SET voucher_date=?, narration=?, party_id=?, group_id=?,
          group_name=?, item_name=?, amount=?, paid=?, due=?, payment_type=?,  payment_mode=?,
    bank_id=?,
    cheque_number=?,
    cheque_date=?
      WHERE id=? AND company_id=?
      `,
      [
        finalDate,
        narration,
        finalPartyId,
        finalGroupId,
        group_name,
        item_name,
        finalAmount,
        finalPaid,
        finalDue,
        payment_type,
        payment_mode || null,
        bank_id || null,
        cheque_number || null,
        cheque_date || null,
        journalId,
        company_id,
      ],
    );

    /* 3️⃣ DELETE ALL OLD LEDGER (🔥 MAIN FIX) */
    await conn.query(
      `
      DELETE FROM ledger_entries
      WHERE source_id=? AND company_id=?
        AND source_type IN ('JOURNAL','RECEIPT')
      `,
      [voucher_no, company_id],
    );

    /* 4️⃣ JOURNAL ENTRIES */

    // Party DR
    await conn.execute(
      `
      INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id,
       ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'JOURNAL', ?, ?, ?, ?, 0, ?)
      `,
      [
        company_id,
        finalDate,
        voucher_no,
        ledger_id,
        finalPartyId,
        finalAmount,
        narration,
      ],
    );

    // Group CR
    await conn.execute(
      `
      INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id,
       ledger_id, debit, credit, narration)
      VALUES (?, ?, 'JOURNAL', ?, ?, 0, ?, ?)
      `,
      [company_id, finalDate, voucher_no, finalGroupId, finalAmount, narration],
    );

    /* 5️⃣ RECEIPT ENTRIES (ONLY IF PAID) */
    if (finalPaid > 0 && payment_type !== "none") {
      // Party CR
      await conn.execute(
        `
        INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id,
         ledger_id, party_id, debit, credit, narration)
        VALUES (?, ?, 'RECEIPT', ?, ?, ?, 0, ?, ?)
        `,
        [
          company_id,
          finalDate,
          voucher_no,
          ledger_id,
          finalPartyId,
          finalPaid,
          "Receipt",
        ],
      );
    }

    await conn.commit();
    res.json({ success: true, message: "Journal updated perfectly ✅" });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
};

exports.deleteJournal = async (req, res) => {
  const { id } = req.params;

  let [[voucher]] = await db.query(
    `SELECT voucher_no, company_id FROM jurnal_voucher WHERE id=?`,
    [id],
  );

  let isThirdParty = false;
  if (!voucher) {
    [[voucher]] = await db.query(
      `SELECT voucher_no, company_id FROM third_party_voucher WHERE id=?`,
      [id],
    );
    isThirdParty = true;
  }

  if (!voucher) {
    return res.status(404).json({ error: "Journal not found" });
  }

  if (isThirdParty) {
    await db.query(
      `UPDATE third_party_voucher
       SET status='inactive', deleted_at=NOW()
       WHERE id=?`,
      [id],
    );
  } else {
    await db.query(
      `UPDATE jurnal_voucher
       SET status='inactive', deleted_at=NOW()
       WHERE id=?`,
      [id],
    );
  }

  await db.query(
    `DELETE FROM ledger_entries
     WHERE source_id=? AND company_id=?`,
    [voucher.voucher_no, voucher.company_id],
  );

  res.json({ success: true });
};

exports.getJournalById = async (req, res) => {
  const id = req.params.id;

  let [[header]] = await db.query(
    `SELECT 
        j.*,
        p.company_name AS party_name,
        p.gst_number   AS gst_no,
        p.address,
        p.city,
        p.state,
        p.pincode      AS pin,
        p.mobile_number AS mobile,
        dp.company_name AS dest_party_name
     FROM jurnal_voucher j
     LEFT JOIN party p ON p.id = j.party_id
     LEFT JOIN party dp ON dp.id = j.dest_party_id
     WHERE j.id = ? AND j.status = 'active'`,
    [id],
  );

  if (!header) {
    [[header]] = await db.query(
      `SELECT 
          j.id,
          j.company_id,
          j.voucher_no,
          j.voucher_date,
          j.party_id,
          j.dest_party_id,
          j.voucher_type,
          j.paid_amount,
          j.due_amount,
          j.total_amount,
          j.payment_type,
          j.bank_id,
          j.payment_mode,
          j.check_number,
          j.transaction_type,
          j.narration,
          j.status,
          p.company_name AS party_name,
          p.gst_number   AS gst_no,
          p.address,
          p.city,
          p.state,
          p.pincode      AS pin,
          p.mobile_number AS mobile,
          dp.company_name AS dest_party_name
       FROM third_party_voucher j
       LEFT JOIN party p ON p.id = j.party_id
       LEFT JOIN party dp ON dp.id = j.dest_party_id
       WHERE j.id = ? AND j.status = 'active'`,
      [id],
    );
  }

  if (!header) {
    return res.status(404).json({ error: "Journal not found" });
  }

  const [entries] = await db.query(
    `SELECT e.*, l.name AS ledger_name
     FROM jurnal_voucher_entries e
     JOIN ledgers l ON l.id = e.ledger_id
     WHERE e.jurnal_voucher_id = ?`,
    [id],
  );

  res.json({ header, entries });
};

exports.getJournalsByCompany = async (req, res) => {
  try {
    const company_id = req.params.company_id;

    const [rows] = await db.query(
      `SELECT 
          j.id,
          j.voucher_no,
          j.voucher_date,
          j.narration,
          j.amount,
          j.paid,
          j.due,
          j.payment_type,
          j.transaction_type,
          j.party_id,
          p.company_name AS party_name,
          j.dest_party_id,
          dp.company_name AS dest_party_name,
          j.group_id,
          j.group_name,
          j.item_name
       FROM jurnal_voucher j
       LEFT JOIN party p ON p.id = j.party_id
       LEFT JOIN party dp ON dp.id = j.dest_party_id
       WHERE j.company_id = ?
         AND j.status = 'active'
       UNION ALL
       SELECT 
          j.id,
          j.voucher_no,
          j.voucher_date,
          j.narration,
          j.paid_amount AS amount,
          j.paid_amount AS paid,
          j.due_amount AS due,
          'thirdparty' AS payment_type,
          j.transaction_type,
          j.party_id,
          p.company_name AS party_name,
          j.dest_party_id,
          dp.company_name AS dest_party_name,
          NULL AS group_id,
          NULL AS group_name,
          NULL AS item_name
       FROM third_party_voucher j
       LEFT JOIN party p ON p.id = j.party_id
       LEFT JOIN party dp ON dp.id = j.dest_party_id
       WHERE j.company_id = ?
         AND j.status = 'active'
       ORDER BY id DESC`,
      [company_id, company_id],
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createThirdPartyJournal = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      company_id,
      voucher_date,
      narration,
      party_id,
      dest_party_id,
      voucher_type,
      paid_amount,
      due_amount,
      total_amount,
      payment_type,
      bank_id,
      payment_mode,
      check_number,
      transaction_type,
    } = req.body;

    if (!company_id) throw new Error("company_id missing");
    if (!party_id || !dest_party_id) throw new Error("Required fields missing");

    const finalAmount = Number(paid_amount || 0);

    await conn.beginTransaction();

    // 🔥 AUTO GENERATE THIRD PARTY JOURNAL VOUCHER NUMBER
    const typeKey = (voucher_type === "thirdparty_receipt") ? "THIRDPARTY_RECEIPT" : "THIRDPARTY_PAYMENT";
    const finalVoucherNo = await generateVoucherNumber(
      conn,
      company_id,
      typeKey,
    );

    // ✅ GET LEDGER ID & NUMBER (SOURCE PARTY)
    const [[ledger]] = await conn.query(
      `
      SELECT id, ledger_number 
      FROM ledgers 
      WHERE party_id = ? 
      AND company_id = ?
      LIMIT 1
      `,
      [Number(party_id), Number(company_id)],
    );

    const ledger_id = ledger?.id || null;

    // ✅ GET LEDGER ID (DESTINATION PARTY)
    const [[destLedger]] = await conn.query(
      `
      SELECT id 
      FROM ledgers 
      WHERE party_id = ? 
      AND company_id = ?
      LIMIT 1
      `,
      [Number(dest_party_id), Number(company_id)],
    );
    const dest_ledger_id = destLedger?.id || null;

    /* ---- Journal Header ---- */
    await conn.query(
      `
      INSERT INTO third_party_voucher
      (company_id, voucher_no, voucher_date, party_id, dest_party_id, 
       voucher_type, paid_amount, due_amount, total_amount, 
       payment_type, bank_id, payment_mode, check_number, transaction_type, 
       narration, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        company_id,
        finalVoucherNo,
        voucher_date,
        party_id,
        dest_party_id,
        voucher_type || 'thirdparty_payment',
        finalAmount,
        Number(due_amount || 0),
        Number(total_amount || 0),
        payment_type || null,
        bank_id || null,
        payment_mode || null,
        check_number || null,
        transaction_type || null,
        narration || null
      ],
    );

    // 1. Destination Party (Third Party): Debit the paid amount
    await conn.execute(
      `
      INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id,
       ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'JOURNAL_VOUCHER', ?, ?, ?, ?, 0, ?)
      `,
      [
        company_id,
        voucher_date,
        finalVoucherNo,
        dest_ledger_id,
        dest_party_id,
        finalAmount,
        narration || `Third Party Journal Entry - ${transaction_type || "COD"}`,
      ],
    );

    // 2. Source Party: Credit the paid amount
    await conn.execute(
      `
      INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id,
       ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'JOURNAL_VOUCHER', ?, ?, ?, 0, ?, ?)
      `,
      [
        company_id,
        voucher_date,
        finalVoucherNo,
        ledger_id,
        party_id,
        finalAmount,
        narration || `Third Party Journal Entry - ${transaction_type || "COD"}`,
      ],
    );

    await conn.commit();
    res.json({
      success: true,
      finalVoucherNo,
      message: "Third Party Journal created perfectly ✅",
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
};

exports.updateThirdPartyJournal = async (req, res) => {
  const journalId = req.params.id;
  const conn = await db.getConnection();

  try {
    const {
      company_id,
      voucher_date,
      narration,
      party_id,
      dest_party_id,
      voucher_type,
      paid_amount,
      due_amount,
      total_amount,
      payment_type,
      bank_id,
      payment_mode,
      check_number,
      transaction_type,
    } = req.body;

    if (!company_id) throw new Error("company_id missing");
    if (!party_id || !dest_party_id) throw new Error("Required fields missing");

    const finalAmount = Number(paid_amount || 0);
    await conn.beginTransaction();

    /* 1️⃣ Get Old journal details */
    const [[old]] = await conn.query(
      `SELECT voucher_no FROM third_party_voucher WHERE id=? AND company_id=? AND status='active'`,
      [journalId, company_id],
    );
    if (!old) throw new Error("Voucher not found");
    const voucher_no = old.voucher_no;

    // ✅ GET LEDGER ID & NUMBER (SOURCE PARTY)
    const [[ledger]] = await conn.query(
      `
      SELECT id, ledger_number 
      FROM ledgers 
      WHERE party_id = ? 
      AND company_id = ?
      LIMIT 1
      `,
      [Number(party_id), Number(company_id)],
    );
    const ledger_id = ledger?.id || null;

    // ✅ GET LEDGER ID (DESTINATION PARTY)
    const [[destLedger]] = await conn.query(
      `
      SELECT id 
      FROM ledgers 
      WHERE party_id = ? 
      AND company_id = ?
      LIMIT 1
      `,
      [Number(dest_party_id), Number(company_id)],
    );
    const dest_ledger_id = destLedger?.id || null;

    /* 2️⃣ Update journal header */
    await conn.query(
      `
      UPDATE third_party_voucher
      SET voucher_date=?, party_id=?, dest_party_id=?, 
          voucher_type=?, paid_amount=?, due_amount=?, total_amount=?,
          payment_type=?, bank_id=?, payment_mode=?, check_number=?, 
          transaction_type=?, narration=?
      WHERE id=? AND company_id=?
      `,
      [
        voucher_date,
        party_id,
        dest_party_id,
        voucher_type || 'thirdparty_payment',
        finalAmount,
        Number(due_amount || 0),
        Number(total_amount || 0),
        payment_type || null,
        bank_id || null,
        payment_mode || null,
        check_number || null,
        transaction_type || null,
        narration || null,
        journalId,
        company_id,
      ],
    );

    /* 3️⃣ DELETE ALL OLD LEDGER ENTRIES */
    await conn.query(
      `
      DELETE FROM ledger_entries
      WHERE source_id=? AND company_id=?
        AND source_type = 'JOURNAL_VOUCHER'
      `,
      [voucher_no, company_id],
    );

    /* 4️⃣ INSERT NEW LEDGER ENTRIES */
    // 1. Destination Party (Third Party): Debit the paid amount
    await conn.execute(
      `
      INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id,
       ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'JOURNAL_VOUCHER', ?, ?, ?, ?, 0, ?)
      `,
      [
        company_id,
        voucher_date,
        voucher_no,
        dest_ledger_id,
        dest_party_id,
        finalAmount,
        narration || `Third Party Journal Entry - ${transaction_type || "COD"}`,
      ],
    );

    // 2. Source Party: Credit the paid amount
    await conn.execute(
      `
      INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id,
       ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'JOURNAL_VOUCHER', ?, ?, ?, 0, ?, ?)
      `,
      [
        company_id,
        voucher_date,
        voucher_no,
        ledger_id,
        party_id,
        finalAmount,
        narration || `Third Party Journal Entry - ${transaction_type || "COD"}`,
      ],
    );

    await conn.commit();
    res.json({
      success: true,
      message: "Third Party Journal updated perfectly ✅",
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
};
