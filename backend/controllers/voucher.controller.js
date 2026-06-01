const db = require("../config/db");
const generateVoucherNumber = require("../utils/generateVoucherNumber");

exports.listPartyWithDues = async (req, res, next) => {
  try {
    const company_id = req.company_id;

    const [rows] = await db.execute(
      `
      SELECT 
        p.id,
        p.company_name,
        p.mobile_number,
        p.gst_number,
        p.address,
        p.city,
        p.state,
        p.pincode,
            l.ledger_number, 
        COALESCE((
          SELECT SUM(due_amount)
          FROM sale_bill s
          WHERE s.party_id = p.id
            AND s.status = 'active'
        ), 0) AS sales_due,

        COALESCE((
          SELECT SUM(due_amount)
          FROM purchase_bill pb
          WHERE pb.party_id = p.id
            AND pb.status = 'active'
        ), 0) AS purchase_due

      FROM party p

          LEFT JOIN ledgers l 
        ON l.party_id = p.id 
        AND l.company_id = p.company_id  
       
      WHERE p.company_id = ?
        AND p.status = 'active'
      ORDER BY p.company_name
      `,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getPartyDues = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company_id = req.company_id;

    // Get the ledger ID for this party
    const [[ledger]] = await db.execute(
      `SELECT id FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1`,
      [id, company_id]
    );
    const ledger_id = ledger?.id || 0;

    const [rows] = await db.execute(
      `
      SELECT
        COALESCE(SUM(debit),0) - COALESCE(SUM(credit),0) AS sales_due
      FROM ledger_entries
      WHERE company_id = ?
        AND (
          ledger_id = ?
          OR (ledger_id = ? AND party_id = ?)
        )
    `,
      [company_id, ledger_id, id, id],
    );

    res.json({
      sales_due: rows[0].sales_due || 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.createVoucher = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const company_id = req.company_id;
    await conn.beginTransaction();

// ✅ STEP 1: destructure first
const {
  voucher_type,
  voucher_no,
  voucher_date,
  party_id,
  total_dues,
  payment_amount,
  payment_type,
  payment_mode,
  bank_id,
  cheque_number,
  cheque_date,
  remark,
  entries,
} = req.body;

// ✅ STEP 2: fetch ledger
const [[ledger]] = await db.query(
  `
  SELECT id, ledger_number 
  FROM ledgers 
  WHERE party_id = ? 
  AND company_id = ?
  LIMIT 1
  `,
  [Number(party_id), Number(company_id)]
);

// ✅ STEP 3: use ledger
const ledger_id = ledger?.id || null;
const ledger_number = ledger?.ledger_number || null;

console.log("VOUCHER LEDGER:", ledger_number);

    if (
      !company_id ||
      !voucher_type ||
      !voucher_date ||
      !party_id ||
      !payment_amount
    )
      return res.status(400).json({ error: "Missing required fields" });

    // 🔥 AUTO GENERATE VOUCHER NO → KNFS/VCH/001

    const finalVoucherNo = await generateVoucherNumber(
      conn,
      company_id,
      voucher_type,
    );



    const [[dueRow]] = await conn.execute(
      `
SELECT 
COALESCE(SUM(due_amount),0) AS balance
FROM sale_bill
WHERE party_id = ?
AND status='active'
`,
      [party_id],
    );

    const currentDue = Number(dueRow.balance || 0);

    const due = Math.max(currentDue - Number(payment_amount || 0), 0);

    const [vRes] = await conn.execute(
      `
      INSERT INTO vouchers
      (company_id, voucher_type, voucher_no, voucher_date, party_id,ledger_number,
       total_dues, due, payment_amount,  payment_type, payment_mode, bank_id, cheque_number, cheque_date, remark)
      VALUES (?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        company_id ?? null,
        voucher_type ?? null,
        finalVoucherNo ?? null,
        voucher_date ?? null,
        party_id ?? null,
        ledger_number ?? null,
        Number(total_dues) || 0,
        Number(due) || 0,
        Number(payment_amount) || 0,
        payment_type ?? null,
        payment_type === "BANK" ? (payment_mode ?? null) : null,
        payment_type === "BANK" ? (bank_id ?? null) : null,
        payment_mode === "CHEQUE" ? (cheque_number ?? null) : null,
        payment_mode === "CHEQUE" ? (cheque_date ?? null) : null,
        remark ?? null,
      ],
    );

    const voucherId = vRes.insertId;

    for (let e of entries || []) {
      await conn.execute(
        `
        INSERT INTO voucher_entries
        (voucher_id, party_id, debit, credit)
        VALUES (?, ?, ?, ?)
        `,
        [voucherId, e.party_id, e.debit || 0, e.credit || 0],
      );
    }

    // ---------------- LEDGER ENTRY FOR PARTY ONLY ----------------
    for (let e of entries || []) {
      // 🔥 ONLY PARTY ENTRY GOES TO PARTY LEDGER
      if (e.party_id !== party_id) continue;

      await conn.execute(
        `
    INSERT INTO ledger_entries
    (company_id, entry_date, source_type, source_id,
     ledger_id, party_id, debit, credit, narration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
        [
          company_id,
          voucher_date,
          voucher_type, // RECEIPT / PAYMENT
          finalVoucherNo, // voucher no
          ledger_id, // ✅ ledger_id = PARTY
          party_id, // ✅ party_id = PARTY
          e.debit || 0,
          e.credit || 0,
          remark || `${voucher_type} Voucher`,
        ],
      );
    }

    /* ================= APPLY PAYMENT TO SALE BILLS ================= */

    if (voucher_type === "RECEIPT") {
      let remaining = Number(payment_amount);

      const [bills] = await conn.execute(
        `
SELECT id, due_amount
FROM sale_bill
WHERE party_id = ?
AND due_amount > 0
AND status='active'
ORDER BY voucher_date ASC
`,
        [party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const pay = Math.min(remaining, Number(bill.due_amount));

        await conn.execute(
          `
UPDATE sale_bill
SET paid_amount = paid_amount + ?,
    due_amount = due_amount - ?
WHERE id = ?
`,
          [pay, pay, bill.id],
        );

        remaining -= pay;
      }
    }

    if (voucher_type === "PAYMENT") {
      let remaining = Number(payment_amount);

      const [bills] = await conn.execute(
        `
SELECT id, due_amount
FROM purchase_bill
WHERE party_id = ?
AND due_amount > 0
AND status='active'
ORDER BY voucher_date ASC
`,
        [party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const pay = Math.min(remaining, Number(bill.due_amount));

        await conn.execute(
          `
UPDATE purchase_bill
SET paid_amount = paid_amount + ?,
    due_amount = due_amount - ?
WHERE id = ?
`,
          [pay, pay, bill.id],
        );

        remaining -= pay;
      }
    }

    await conn.commit();

    res.json({
      success: true,
      voucher_id: voucherId,
      voucher_no: finalVoucherNo, // 👈 return for UI
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.updateVoucher = async (req, res, next) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // =====================================================
    // STEP 0: GET OLD VOUCHER
    // =====================================================

    const [oldRows] = await conn.execute(
      `SELECT * FROM vouchers WHERE id = ? AND status='active'`,
      [id],
    );

    if (!oldRows.length) {
      await conn.rollback();

      return res.status(404).json({
        error: "Voucher not found",
      });
    }

    const old = oldRows[0];

    // =====================================================
    // STEP 1: NEW VALUES
    // =====================================================

    const {
      voucher_type,
      voucher_date,
      party_id,
      total_dues,
      payment_amount,
      payment_type, // ✅
      payment_mode,
      bank_id, // ✅
      cheque_number, // ✅
      cheque_date, // ✅
      remark,
      entries,
    } = req.body;

    const paymentAmount = Number(payment_amount || 0);

    const [[ledger]] = await conn.execute(
      `SELECT id FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1`,
      [Number(party_id), Number(old.company_id)]
    );
    const ledger_id = ledger?.id || null;

    // const due = Math.max(Number(total_dues || 0) - paymentAmount, 0);

    const [[dueRow]] = await conn.execute(
      `
SELECT COALESCE(SUM(due_amount),0) AS balance
FROM sale_bill
WHERE party_id = ?
AND status='active'
`,
      [party_id],
    );

    const currentDue = Number(dueRow.balance || 0);

    const due = Math.max(currentDue - paymentAmount, 0);

    // =====================================================
    // STEP 2: UNDO OLD BILL EFFECT
    // =====================================================

    if (old.voucher_type === "RECEIPT") {
      let remaining = Number(old.payment_amount);

      const [bills] = await conn.execute(
        `
        SELECT id, paid_amount
        FROM sale_bill
        WHERE party_id = ?
        AND paid_amount > 0
        AND status='active'
        ORDER BY voucher_date ASC
        `,
        [old.party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const undo = Math.min(remaining, Number(bill.paid_amount));

        await conn.execute(
          `
          UPDATE sale_bill
          SET paid_amount = paid_amount - ?,
              due_amount = due_amount + ?
          WHERE id = ?
          `,
          [undo, undo, bill.id],
        );

        remaining -= undo;
      }
    }

    if (old.voucher_type === "PAYMENT") {
      let remaining = Number(old.payment_amount);

      const [bills] = await conn.execute(
        `
        SELECT id, paid_amount
        FROM purchase_bill
        WHERE party_id = ?
        AND paid_amount > 0
        AND status='active'
        ORDER BY voucher_date ASC
        `,
        [old.party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const undo = Math.min(remaining, Number(bill.paid_amount));

        await conn.execute(
          `
          UPDATE purchase_bill
          SET paid_amount = paid_amount - ?,
              due_amount = due_amount + ?
          WHERE id = ?
          `,
          [undo, undo, bill.id],
        );

        remaining -= undo;
      }
    }

    // =====================================================
    // STEP 3: DELETE OLD LEDGER ENTRY (FINAL FIX)
    // =====================================================

    await conn.execute(
      `
      DELETE FROM ledger_entries
      WHERE company_id = ?
      AND source_id = ?
      `,
      [old.company_id, old.voucher_no],
    );

    // =====================================================
    // STEP 4: DELETE OLD VOUCHER ENTRIES
    // =====================================================

    await conn.execute(
      `
      DELETE FROM voucher_entries
      WHERE voucher_id = ?
      `,
      [id],
    );

    // =====================================================
    // STEP 5: UPDATE VOUCHER HEADER
    // =====================================================

    await conn.execute(
      ` UPDATE vouchers SET
  voucher_type = ?,
  voucher_date = ?,
  party_id = ?,
  total_dues = ?,
  due = ?,
  payment_amount = ?,
  payment_type = ?,
  payment_mode = ?,
 bank_id = ?,
  cheque_number = ?,
  cheque_date = ?,
  remark = ?
WHERE id = ?
      `,
      [
        voucher_type,
        voucher_date,
        party_id,
        Number(total_dues || 0),
        due,
        paymentAmount,
        payment_type || null,
        payment_type === "BANK" ? payment_mode : null,
        payment_type === "BANK" ? bank_id : null,
        payment_mode === "CHEQUE" ? cheque_number : null,
        payment_mode === "CHEQUE" ? cheque_date : null,

        remark || null,
        id,
      ],
    );

    // =====================================================
    // STEP 6: INSERT NEW VOUCHER ENTRIES
    // =====================================================

    for (let e of entries || []) {
      await conn.execute(
        `
        INSERT INTO voucher_entries
        (voucher_id, party_id, debit, credit)
        VALUES (?, ?, ?, ?)
        `,
        [id, Number(e.party_id), Number(e.debit || 0), Number(e.credit || 0)],
      );
    }

    // =====================================================
    // STEP 7: INSERT NEW LEDGER ENTRY
    // =====================================================

    for (let e of entries || []) {
      if (Number(e.party_id) !== Number(party_id)) continue;

      await conn.execute(
        `
        INSERT INTO ledger_entries
        (
          company_id,
          entry_date,
          source_type,
          source_id,
          ledger_id,
          party_id,
          debit,
          credit,
          narration
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          old.company_id,
          voucher_date,
          voucher_type,
          old.voucher_no,
          ledger_id,
          party_id,
          Number(e.debit || 0),
          Number(e.credit || 0),
          remark || `${voucher_type} Voucher`,
        ],
      );
    }

    // =====================================================
    // STEP 8: APPLY NEW BILL EFFECT
    // =====================================================

    if (voucher_type === "RECEIPT") {
      let remaining = paymentAmount;

      const [bills] = await conn.execute(
        `
        SELECT id, due_amount
        FROM sale_bill
        WHERE party_id = ?
        AND due_amount > 0
        AND status='active'
        ORDER BY voucher_date ASC
        `,
        [party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const pay = Math.min(remaining, Number(bill.due_amount));

        await conn.execute(
          `
          UPDATE sale_bill
          SET paid_amount = paid_amount + ?,
              due_amount = due_amount - ?
          WHERE id = ?
          `,
          [pay, pay, bill.id],
        );

        remaining -= pay;
      }
    }

    if (voucher_type === "PAYMENT") {
      let remaining = paymentAmount;

      const [bills] = await conn.execute(
        `
        SELECT id, due_amount
        FROM purchase_bill
        WHERE party_id = ?
        AND due_amount > 0
        AND status='active'
        ORDER BY voucher_date ASC
        `,
        [party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const pay = Math.min(remaining, Number(bill.due_amount));

        await conn.execute(
          `
          UPDATE purchase_bill
          SET paid_amount = paid_amount + ?,
              due_amount = due_amount - ?
          WHERE id = ?
          `,
          [pay, pay, bill.id],
        );

        remaining -= pay;
      }
    }

    // =====================================================
    // STEP 9: COMMIT
    // =====================================================

    await conn.commit();

    res.json({
      success: true,
      message: "Voucher updated successfully",
    });
  } catch (err) {
    await conn.rollback();

    console.error("Voucher Update Error:", err);

    next(err);
  } finally {
    conn.release();
  }
};

exports.listVouchers = async (req, res, next) => {
  try {
    const company_id = req.company_id || req.query.company_id;

    if (!company_id)
      return res.status(400).json({ error: "company_id is required" });

    const [rows] = await db.execute(
      `
      SELECT 
  v.*,
  p.company_name AS party_name,
  p.mobile_number AS mobile,
  p.gst_number,
  p.address,
  p.city,
  p.state,
  p.pincode,
  b.bank_name
FROM vouchers v
LEFT JOIN party p ON p.id = v.party_id
LEFT JOIN banks_master b ON b.id = v.bank_id
WHERE v.company_id = ?
AND v.status = 'active'
ORDER BY v.voucher_date DESC, v.id DESC
      `,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getVoucherById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [vRows] = await db.execute(
      `
      SELECT 
        v.*,

        p.company_name  AS party_name,
        p.mobile_number AS mobile,
        p.gst_number    AS gst_no,     -- ✅ correct column + alias
        p.address,
        p.city,
        p.state,
        p.pincode       AS pin  ,       -- ✅ correct column + alias
        b.bank_name AS bank_name



  FROM vouchers v
LEFT JOIN party p ON p.id = v.party_id
LEFT JOIN banks_master b ON b.id = v.bank_id
      WHERE v.id = ?
      LIMIT 1
      `,
      [id],
    );

    if (!vRows.length) return res.json(null);

    const voucher = vRows[0];

    const [eRows] = await db.execute(
      `
      SELECT id, party_id, debit, credit
      FROM voucher_entries
      WHERE voucher_id = ?
      `,
      [id],
    );

    voucher.entries = eRows;

    res.json({ voucher });
  } catch (err) {
    next(err);
  }
};

exports.cancelVoucher = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [rows] = await conn.execute("SELECT * FROM vouchers WHERE id = ?", [
      id,
    ]);

    if (!rows.length)
      return res.status(404).json({ error: "Voucher not found" });

    const v = rows[0];
    let remaining = v.payment_amount;

    await conn.execute(
      `DELETE FROM ledger_entries
   WHERE company_id = ?
   AND source_id = ?`,
      [v.company_id, v.voucher_no],
    );

    if (v.voucher_type === "RECEIPT") {
      const [bills] = await conn.execute(
        `
        SELECT id, paid_amount
        FROM sale_bill
        WHERE party_id = ?
          AND paid_amount > 0
          AND status='active'
        ORDER BY voucher_date DESC
        `,
        [v.party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const undo = Math.min(remaining, bill.paid_amount);

        await conn.execute(
          `
          UPDATE sale_bill
          SET paid_amount = paid_amount - ?,
              due_amount = due_amount + ?
          WHERE id = ?
          `,
          [undo, undo, bill.id],
        );

        remaining -= undo;
      }
    }

    if (v.voucher_type === "PAYMENT") {
      const [bills] = await conn.execute(
        `
        SELECT id, paid_amount
        FROM purchase_bill
        WHERE party_id = ?
          AND paid_amount > 0
        ORDER BY voucher_date DESC
        `,
        [v.party_id],
      );

      for (let bill of bills) {
        if (remaining <= 0) break;

        const undo = Math.min(remaining, bill.paid_amount);

        await conn.execute(
          `
          UPDATE purchase_bill
          SET paid_amount = paid_amount - ?,
              due_amount = due_amount + ?
          WHERE id = ?
          `,
          [undo, undo, bill.id],
        );

        remaining -= undo;
      }
    }

    await conn.execute("UPDATE vouchers SET status='cancelled' WHERE id = ?", [
      id,
    ]);

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

exports.getNextVoucher = async (req, res) => {
  try {
    const company_id = req.company_id;
    const { voucher_type } = req.params;

    const [rows] = await db.execute(
      `SELECT * FROM prefix_master
       WHERE company_id=? 
       AND voucher_type=? 
       AND is_active=1
       AND deleted_at IS NULL`,
      [company_id, voucher_type],
    );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Prefix not configured",
      });
    }

    const config = rows[0];

    const nextNumber =
      config.current_number === 0
        ? config.start_number
        : config.current_number + 1;

    const padded = String(nextNumber).padStart(config.padding_length, "0");

    const voucher_no = config.prefix_name + config.number_separator + padded;

    res.json({
      success: true,
      voucher_no,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getVoucherReport = async (req, res, next) => {
  try {
    const company_id = req.company_id;
    const {
      voucher_type,
      party_id,
      bank_id,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    if (!company_id) {
      return res.status(400).json({
        error: "company_id is required",
      });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = `WHERE v.company_id = ? AND v.status='active'`;
    const params = [company_id];

    if (voucher_type) {
      where += ` AND v.voucher_type = ?`;
      params.push(voucher_type);
    }

    if (party_id) {
      where += ` AND v.party_id = ?`;
      params.push(party_id);
    }

    if (bank_id) {
      where += ` AND v.bank_id = ?`;
      params.push(bank_id);
    }

    if (fromDate && toDate) {
      where += ` AND v.voucher_date BETWEEN ? AND ?`;
      params.push(fromDate, toDate);
    }

    if (search) {
      where += `
      AND (
        v.voucher_no LIKE ?
        OR p.company_name LIKE ?
        OR v.remark LIKE ?
      )`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await db.execute(
      `
SELECT 
v.id,
v.voucher_no,
v.voucher_type,
v.voucher_date,
v.party_id, 
p.company_name AS party_name,
p.mobile_number,
v.payment_amount,
v.payment_type,
v.payment_mode,
b.bank_name,
v.total_dues,
v.due,
v.cheque_number,
v.cheque_date,
v.remark
FROM vouchers v
LEFT JOIN party p ON p.id = v.party_id
LEFT JOIN banks_master b ON b.id = v.bank_id
${where}
ORDER BY v.voucher_date DESC
LIMIT ? OFFSET ?
`,
      [...params, limitNum, offset],
    );

    const [countRows] = await db.execute(
      `
SELECT COUNT(*) AS total
FROM vouchers v
LEFT JOIN party p ON p.id = v.party_id
${where}
`,
      params,
    );

    const [summary] = await db.execute(
      `
SELECT
SUM(CASE WHEN v.voucher_type='RECEIPT' THEN v.payment_amount ELSE 0 END) AS total_receipt,
SUM(CASE WHEN v.voucher_type='PAYMENT' THEN v.payment_amount ELSE 0 END) AS total_payment
FROM vouchers v
LEFT JOIN party p ON p.id = v.party_id
${where}
`,
      params,
    );

    res.json({
      success: true,
      summary: summary[0],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countRows[0].total,
        pages: Math.ceil(countRows[0].total / limitNum),
      },
      data: rows,
    });
  } catch (err) {
    next(err);
  }
};
