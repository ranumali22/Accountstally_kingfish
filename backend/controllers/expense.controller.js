

const db = require("../config/db");
const path = require("path");

const generateVoucherNumber = require("../utils/generateVoucherNumber");

exports.createExpense = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      bill_number,
      party_id,
      paid = 0,
      expense_date,
      payment_type,
      payment_mode,
      bank_id,
      cheque_number,
      cheque_date,
      narration,
    } = req.body;

    const company_id = req.company_id;
    const rows = JSON.parse(req.body.rows || "[]");

    if (!rows.length || !party_id || !expense_date || !payment_type) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (payment_type === "BANK" && !bank_id) {
      return res.status(400).json({ message: "Bank required" });
    }

    await conn.beginTransaction();

    /* ================= TOTAL ================= */
    const total = Number(req.body.total_amount || 0);
    const paidAmt = Number(paid || 0);
    const due = Number(req.body.due ?? Math.max(total - paidAmt, 0));

    /* ================= VOUCHER ================= */
    const voucher_number = await generateVoucherNumber(
      conn,
      company_id,
      "EXPENSE",
    );

    /* ================= LEDGER ================= */
    const [[ledger]] = await conn.query(
      `SELECT ledger_number FROM ledgers 
       WHERE party_id=? AND company_id=? LIMIT 1`,
      [party_id, company_id],
    );

    const ledger_number = ledger?.ledger_number || null;

    /* ================= PAYMENT CLEAN ================= */
    let final_bank_id = null;
    let final_payment_mode = null;
    let final_cheque_number = null;
    let final_cheque_date = null;

    if (payment_type === "BANK") {
      final_bank_id = Number(bank_id);
      final_payment_mode = payment_mode || null;
      final_cheque_number = cheque_number || null;
      final_cheque_date = cheque_date || null;
    }

    const firstRow = rows[0];

    if (!firstRow?.expenseMasterId || !firstRow?.expenseTypeId) {
      return res.status(400).json({
        message: "Expense master & type required",
      });
    }

    /* ================= INSERT ================= */
    const [expRes] = await conn.query(
      `INSERT INTO expenses
      (company_id, voucher_number, bill_number,
       expense_group_id, expense_master_id, expense_type_id,
       party_id, ledger_number,
       amount, paid, due,
       payment_type, payment_mode, bank_id, cheque_number, cheque_date,
       expense_date, narration, document)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id,
        voucher_number,
        bill_number || null,
        firstRow.expenseGroupId || null,
        firstRow.expenseMasterId,
        firstRow.expenseTypeId,
        party_id,
        ledger_number,
        total,
        paidAmt,
        due,
        payment_type,
        final_payment_mode,
        final_bank_id,
        final_cheque_number,
        final_cheque_date,
        expense_date,
        narration || null,
        req.file ? req.file.path.replace(/\\/g, "/") : null, // 🔥 Web Style Path
      ],
    );

    const expenseId = expRes.insertId;

    /* =========================
   TDS SAVE (NEW)
========================= */

    const tds_percent = Number(req.body.tds_percent || 0);
    const tds_on_amount = Number(req.body.tds_on_amount || 0);
    const tds_amount = Number(req.body.tds_amount || 0);

    if (tds_amount > 0) {
      await conn.query(
        `INSERT INTO purchase_bill_tds
    (expense_id, party_id, party_name, tds_percent, tds_on_amount, tds_amount, status)
    VALUES (?, ?, 
      (SELECT company_name FROM party WHERE id=?),
      ?, ?, ?, 'active'
    )`,
        [expenseId, party_id, party_id, tds_percent, tds_on_amount, tds_amount],
      );

      // ✅ LEDGER ENTRY (IMPORTANT)
      await conn.query(
        `INSERT INTO ledger_entries
    (company_id, entry_date, source_type, source_id,
     ledger_id, party_id, debit, credit, narration)
    VALUES (?, ?, 'EXPENSE_TDS', ?, ?, ?, ?, 0, ?)`,
        [
          company_id,
          expense_date,
          voucher_number,
          party_id,
          party_id,
          tds_amount,
          "TDS Deducted",
        ],
      );
    }

    /* ================= ITEMS ================= */
    for (let r of rows) {
      await conn.query(
        `INSERT INTO expense_items (expense_id, expense_master_id, expense_type_id, expense_group_id, amount, tax_id)
VALUES (?, ?, ?, ?, ?, ?)`,
        [
          expenseId,
          r.expenseMasterId,
          r.expenseTypeId,
          r.expenseGroupId,
          Number(r.amount || 0),
          r.taxId || null,
        ],
      );
    }

    /* ================= LEDGER ================= */
    let paymentLedgerId = party_id;

    if (payment_type === "BANK") {
      paymentLedgerId = final_bank_id;
    }

    // CREDIT
    await conn.query(
      `INSERT INTO ledger_entries
      (company_id, entry_date, source_type, source_id,
       ledger_id, party_id, debit, credit, narration)
      VALUES (?, ?, 'EXPENSE', ?, ?, ?, 0, ?, ?)`,
      [
        company_id,
        expense_date,
        voucher_number,
        party_id,
        party_id,
        total,
        "Expense Bill",
      ],
    );

    // DEBIT
    if (paidAmt > 0) {
      await conn.query(
        `INSERT INTO ledger_entries
        (company_id, entry_date, source_type, source_id,
         ledger_id, party_id, debit, credit, narration)
        VALUES (?, ?, 'EXPENSE', ?, ?, ?, ?, 0, ?)`,
        [
          company_id,
          expense_date,
          voucher_number,
          paymentLedgerId,
          party_id,
          paidAmt,
          "Payment made",
        ],
      );
    }

    await conn.commit();

    res.json({
      success: true,
      id: expenseId,
      voucher_number,
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

exports.updateExpense = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { id } = req.params;
    const company_id = req.company_id;

    const {
      party_id,
      bill_number,
      paid = 0,
      expense_date,
      narration,
      payment_type,
      payment_mode,
      bank_id,
      cheque_number,
      cheque_date,
    } = req.body;

    const rows = JSON.parse(req.body.rows || "[]");

    if (!rows.length || !party_id || !expense_date || !payment_type) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    await conn.beginTransaction();

    const [[old]] = await conn.query(
      `SELECT voucher_number FROM expenses
       WHERE id=? AND company_id=? AND is_deleted=0`,
      [id, company_id],
    );

    if (!old) {
      return res.status(404).json({ message: "Not found" });
    }

    const voucher_number = old.voucher_number;

    await conn.query(`DELETE FROM ledger_entries WHERE source_id=?`, [
      voucher_number,
    ]);

    await conn.query(`DELETE FROM expense_items WHERE expense_id=?`, [id]);

    // ✅ DELETE OLD TDS FIRST
    await conn.query(`DELETE FROM purchase_bill_tds WHERE expense_id = ?`, [id]);

    const tds_percent = Number(req.body.tds_percent || 0);
    const tds_on_amount = Number(req.body.tds_on_amount || 0);
    const tds_amount = Number(req.body.tds_amount || 0);

    if (tds_amount > 0) {
      await conn.query(
        `INSERT INTO purchase_bill_tds
    (expense_id, party_id, party_name, tds_percent, tds_on_amount, tds_amount, status)
    VALUES (?, ?, 
      (SELECT company_name FROM party WHERE id=?),
      ?, ?, ?, 'active'
    )`,
        [id, party_id, party_id, tds_percent, tds_on_amount, tds_amount],
      );

      // ✅ LEDGER ENTRY
      await conn.query(
        `INSERT INTO ledger_entries
    (company_id, entry_date, source_type, source_id,
     ledger_id, party_id, debit, credit, narration)
    VALUES (?, ?, 'EXPENSE_TDS', ?, ?, ?, ?, 0, ?)`,
        [
          company_id,
          expense_date,
          voucher_number,
          party_id,
          party_id,
          tds_amount,
          "TDS Deducted",
        ],
      );
    }

    const total = Number(req.body.total_amount || 0);
    const paidAmt = Number(paid || 0);
    const due = Number(req.body.due ?? Math.max(total - paidAmt, 0));

    /* PAYMENT CLEAN */
    let final_bank_id = null;
    let final_payment_mode = null;
    let final_cheque_number = null;
    let final_cheque_date = null;

    if (payment_type === "BANK") {
      final_bank_id = Number(bank_id);
      final_payment_mode = payment_mode || null;
      final_cheque_number = cheque_number || null;
      final_cheque_date = cheque_date || null;
    }

    const firstRow = rows[0];

    if (!firstRow?.expenseMasterId || !firstRow?.expenseTypeId) {
      return res.status(400).json({
        message: "Expense master & type required",
      });
    }

    await conn.query(
      `UPDATE expenses SET
       bill_number=?, party_id=?, expense_group_id=?, 
       expense_master_id=?, expense_type_id=?,
       amount=?, paid=?, due=?,
       payment_type=?, payment_mode=?, bank_id=?, cheque_number=?, cheque_date=?,
       expense_date=?, narration=?
       ${req.file ? ", document=?" : ""}
       WHERE id=? AND company_id=?`,
      [
        bill_number || null,
        party_id,
        firstRow.expenseGroupId || null,
        firstRow.expenseMasterId,
        firstRow.expenseTypeId,
        total,
        paidAmt,
        due,
        payment_type,
        final_payment_mode,
        final_bank_id,
        final_cheque_number,
        final_cheque_date,
        expense_date,
        narration || null,
        ...(req.file ? [req.file.path.replace(/\\/g, "/")] : []), // 🔥 Web Style Path
        id,
        company_id,
      ],
    );

    /* ITEMS */
    for (let r of rows) {
      await conn.query(
        `INSERT INTO expense_items 
   (expense_id, expense_master_id, expense_type_id, expense_group_id, amount, tax_id)
   VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id, // ✅ FIXED
          r.expenseMasterId,
          r.expenseTypeId,
          r.expenseGroupId,
          Number(r.amount || 0),
          r.taxId || null,
        ],
      );
    }

    /* LEDGER */
    let paymentLedgerId = payment_type === "BANK" ? final_bank_id : party_id;

    await conn.query(
      `INSERT INTO ledger_entries
       (company_id, entry_date, source_type, source_id,
        ledger_id, party_id, debit, credit, narration)
       VALUES (?, ?, 'EXPENSE', ?, ?, ?, 0, ?, ?)`,
      [
        company_id,
        expense_date,
        voucher_number,
        party_id,
        party_id,
        total,
        "Expense Updated",
      ],
    );

    if (paidAmt > 0) {
      await conn.query(
        `INSERT INTO ledger_entries
         (company_id, entry_date, source_type, source_id,
          ledger_id, party_id, debit, credit, narration)
         VALUES (?, ?, 'EXPENSE', ?, ?, ?, ?, 0, ?)`,
        [
          company_id,
          expense_date,
          voucher_number,
          paymentLedgerId,
          party_id,
          paidAmt,
          "Payment made",
        ],
      );
    }

    await conn.commit();

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

exports.getExpenses = async (req, res) => {
  const company_id = req.company_id;

  try {
    const [rows] = await db.query(
      `
 SELECT
  e.id,
  e.voucher_number,
  e.bill_number,
  e.expense_date,
  
  /* DYNAMIC TOTAL (Base + Tax) */
  COALESCE(items_total.grand_total, e.amount) AS amount,
  
  /* DYNAMIC PAID (from Ledgers) */
  COALESCE(payments.total_paid, 0) AS paid,
  
  /* DYNAMIC DUE */
  (COALESCE(items_total.grand_total, e.amount) - COALESCE(payments.total_paid, 0)) AS due,

  e.payment_type,
  e.payment_mode,
  e.bank_id,
  e.cheque_number,
  e.cheque_date,
  e.status,
  e.narration,
  e.document,    

  -- IDs
  e.expense_group_id,
  e.expense_master_id,
  e.expense_type_id,
  e.party_id,

  -- names
  em.expense_master,
  et.expense_type,
  gm.name AS expense_group_name,

  -- party
  p.company_name   AS party_name,
  p.gst_number     AS party_gst,
  p.mobile_number  AS party_phone,
  p.address        AS party_address,
  p.city,
  p.state,
  p.pincode

FROM expenses e
JOIN expense_master em ON em.id = e.expense_master_id
JOIN expense_type et   ON et.id = e.expense_type_id
JOIN party p           ON p.id = e.party_id

LEFT JOIN groups_master gm 
       ON gm.id = e.expense_group_id

LEFT JOIN (
  /* SUBQUERY FOR TOTAL WITH TAX */
  SELECT 
    ei.expense_id,
    SUM(ei.amount + (ei.amount * COALESCE(tm.tax_percent, 0) / 100)) AS grand_total
  FROM expense_items ei
  LEFT JOIN tax_master tm ON tm.id = ei.tax_id
  GROUP BY ei.expense_id
) items_total ON items_total.expense_id = e.id

LEFT JOIN (
  /* SUBQUERY FOR ACTUAL PAYMENTS */
  SELECT 
    le.source_id,
    le.company_id,
    le.party_id,
    SUM(le.debit) AS total_paid
  FROM ledger_entries le
  WHERE le.source_type IN ('EXPENSE', 'EXPENSE_TDS') 
    AND le.debit > 0
  GROUP BY le.source_id, le.company_id, le.party_id
) payments ON payments.source_id = e.voucher_number 
          AND payments.company_id = e.company_id 
          AND payments.party_id = e.party_id

WHERE e.company_id = ?
  AND e.is_deleted = 0

ORDER BY e.id DESC
      `,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    console.error("GET EXPENSES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getExpenseById = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  try {
    const [[header]] = await db.query(
      `SELECT
          e.id,
          e.voucher_number,
          e.bill_number,
          e.expense_date,
          
          /* DYNAMIC TOTAL */
          COALESCE(items_total.grand_total, e.amount) AS amount,
          
          /* DYNAMIC PAID */
          COALESCE(payments.total_paid, 0) AS paid,
          
          /* DYNAMIC DUE */
          (COALESCE(items_total.grand_total, e.amount) - COALESCE(payments.total_paid, 0)) AS due,

          e.payment_type,
          e.payment_mode,
          e.bank_id,
          e.cheque_number,
          e.cheque_date,
          e.status,
          e.narration,
          e.document,
          e.expense_group_id,
          e.expense_master_id,
          e.expense_type_id,
          e.party_id,

          p.company_name  AS party_name,
          p.gst_number    AS party_gst,
          p.mobile_number AS party_phone,
          p.address       AS party_address,
          p.city,
          p.state,
          p.pincode
       FROM expenses e
       JOIN party p ON p.id = e.party_id

       LEFT JOIN (
         SELECT 
           ei.expense_id,
           SUM(ei.amount + (ei.amount * COALESCE(tm.tax_percent, 0) / 100)) AS grand_total
         FROM expense_items ei
         LEFT JOIN tax_master tm ON tm.id = ei.tax_id
         GROUP BY ei.expense_id
       ) items_total ON items_total.expense_id = e.id

       LEFT JOIN (
         SELECT 
           le.source_id,
           le.company_id,
           le.party_id,
           SUM(le.debit) AS total_paid
         FROM ledger_entries le
         WHERE le.source_type IN ('EXPENSE', 'EXPENSE_TDS') 
           AND le.debit > 0
         GROUP BY le.source_id, le.company_id, le.party_id
       ) payments ON payments.source_id = e.voucher_number 
                 AND payments.company_id = e.company_id 
                 AND payments.party_id = e.party_id

       WHERE e.id = ?
         AND e.company_id = ?
         AND e.is_deleted = 0`,
      [id, company_id],
    );

    if (!header) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // 🔹 Expense Items
    const [items] = await db.query(
      `SELECT *
       FROM expense_items
       WHERE expense_id = ?`,
      [id],
    );

    header.rows = items;

    // 🔥🔥 ADD THIS FOR TDS
    const [[tds]] = await db.query(
      `SELECT tds_percent, tds_amount
       FROM purchase_bill_tds
       WHERE expense_id = ?
       AND status='active'`,
      [id],
    );

    header.tds_percent = tds?.tds_percent || 0;
    header.tds_amount = tds?.tds_amount || 0;

    res.json(header);
  } catch (err) {
    console.error("GET EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleExpenseStatus = async (req, res) => {
  const { id } = req.params;
  const company_id = req.company_id;

  try {
    const [result] = await db.query(
      `UPDATE expenses
       SET status = IF(status = 1, 0, 1)
       WHERE id = ?
         AND company_id = ?
         AND is_deleted = 0`,
      [id, company_id],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense status updated" });
  } catch (err) {
    console.error("TOGGLE STATUS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteExpense = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { id } = req.params;
    const company_id = req.company_id;

    await conn.beginTransaction();

    /* ==============================
       STEP 1: GET EXPENSE
    ============================== */

    const [[expense]] = await conn.query(
      `SELECT voucher_number
       FROM expenses
       WHERE id = ?
         AND company_id = ?
         AND is_deleted = 0`,
      [id, company_id],
    );

    if (!expense) {
      await conn.rollback();
      return res.status(404).json({ message: "Expense not found" });
    }

    const voucher_number = expense.voucher_number;

    /* ==============================
       STEP 2: DELETE LEDGER ENTRIES
    ============================== */

    await conn.query(
      `DELETE FROM ledger_entries
       WHERE source_type IN ('EXPENSE', 'EXPENSE_TDS')
         AND source_id = ?`,
      [voucher_number],
    );

    /* ==============================
       STEP 3: DELETE TDS RECORDS
    ============================== */

    await conn.query(
      `DELETE FROM purchase_bill_tds
       WHERE expense_id = ?`,
      [id],
    );

    /* ==============================
       STEP 4: SOFT DELETE EXPENSE
    ============================== */

    await conn.query(
      `DELETE FROM expense_items
   WHERE expense_id = ?`,
      [id],
    );
    /* ==============================
       STEP 4: SOFT DELETE EXPENSE
    ============================== */

    await conn.query(
      `UPDATE expenses
       SET is_deleted = 1,
           deleted_at = NOW()
       WHERE id = ?
         AND company_id = ?`,
      [id, company_id],
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (err) {
    await conn.rollback();
    console.error("DELETE EXPENSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

exports.getNextExpenseVoucher = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const company_id = req.company_id;
    const voucher_number = await generateVoucherNumber(
      conn,
      company_id,
      "EXPENSE",
      false, // update = false
    );
    res.json({ voucher_number });
  } catch (err) {
    console.error("GET NEXT EXPENSE VOUCHER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};
