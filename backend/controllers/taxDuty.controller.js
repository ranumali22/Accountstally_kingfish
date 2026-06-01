const db = require("../config/db");

/* ================= CREATE TAX DUTY ================= */

exports.createTaxDuty = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      company_id,
      party_id,
      group_id,
      purchase_invoice_no,
      invoices, // 👈 multiple invoices support
      party_name,
      group_name,
      tds,
      payment_type,
      bank_name,
      payment_mode,
      cheque_number,
      cheque_date,
      transaction_date,
      narration,
    } = req.body;

    if (!company_id || !party_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: "company_id, party_id and group_id required",
      });
    }

    await conn.beginTransaction();

    // ✅ GET LEDGER NUMBER
const [[ledger]] = await db.query(
  `
  SELECT ledger_number 
  FROM ledgers 
  WHERE party_id = ? 
  AND company_id = ?
  LIMIT 1
  `,
  [Number(party_id), Number(company_id)]
);

const ledger_number = ledger?.ledger_number || null;

console.log("TAX DUTY LEDGER:", ledger_number);

    /* ================= GET GROUP NAME ================= */

    const [[groupRow]] = await conn.execute(
      `SELECT name FROM groups_master WHERE id = ? LIMIT 1`,
      [group_id],
    );

    const group_name_db = groupRow?.name || null;

    /* ================= INSERT TAX DUTY ================= */

    const [result] = await conn.execute(
      `
INSERT INTO tax_duties
(
  company_id,
  party_id,
  ledger_number,
  group_id,
  purchase_invoice_no,
  party_name,
  group_name,
  tds,
  payment_type,
  bank_name,
  payment_mode,
  cheque_number,
  cheque_date,
  transaction_date,
  narration
)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`,
      [
        company_id,
        party_id,
        ledger_number,
        group_id,
        Array.isArray(invoices) && invoices.length > 1
          ? invoices.join(",")
          : purchase_invoice_no || null,
        party_name || null,
        group_name_db,
        tds || 0,
        payment_type || "CASH",
        bank_name || null,
        payment_mode || null,
        cheque_number || null,
        cheque_date || null,
        transaction_date || null,
        narration || null,
      ],
    );

    const taxDutyId = result.insertId;

    /* ================= UPDATE TDS STATUS & LEDGER ENTRIES ================= */

    const invIds = req.body.invoice_ids;

    if (Array.isArray(invIds) && invIds.length > 0) {
      // ✅ Best Way: Update using specific IDs
      await conn.query(
        `UPDATE purchase_bill_tds SET paid_status = 'PAID', updated_at = NOW() 
         WHERE id IN (?)`,
        [invIds],
      );
    } else if (invoices && invoices.length > 0) {
      // ⚠️ Fallback: Update using invoice numbers (old way)
      for (const inv of invoices) {
        await conn.execute(
          `
          UPDATE purchase_bill_tds pbt
          INNER JOIN party py ON py.id = pbt.party_id
          LEFT JOIN purchase_bill pb ON pb.id = pbt.purchase_bill_id
          LEFT JOIN expenses ex ON ex.id = pbt.expense_id
          SET pbt.paid_status = 'PAID', pbt.updated_at = NOW()
          WHERE (pb.supplier_invoice_no = ? OR ex.voucher_number = ? OR ex.bill_number = ?)
            AND py.company_id = ?
          `,
          [inv, inv, inv, company_id],
        );
      }
    }

    // 🔥 CREATE ACCOUNTING ENTRIES
    const totalTds = Number(tds || 0);
    if (totalTds > 0) {
      // 1. Get Payment Ledger ID
      let paymentLedgerId = null;
      if (payment_type === "BANK") {
        paymentLedgerId = bank_name; // In this system, bank_name usually stores the ID
      } else {
        const [[cashGrp]] = await conn.execute(
          `SELECT id FROM groups_master WHERE company_id = ? AND name = 'Cash-in-Hand' LIMIT 1`,
          [company_id],
        );
        paymentLedgerId = cashGrp?.id || null;
      }

      if (paymentLedgerId) {
        // Entry 1: Debit Tax Group (Reducing Liability)
        await conn.execute(
          `INSERT INTO ledger_entries
          (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
          VALUES (?, ?, 'TDS_PAYMENT', ?, ?, ?, ?, 0, ?)`,
          [
            company_id,
            transaction_date || new Date(),
            `TD-${taxDutyId}`,
            group_id,
            party_id,
            totalTds,
            `TDS Paid for ${party_name}`,
          ],
        );

        // Entry 2: Credit Bank/Cash (Reducing Asset)
        await conn.execute(
          `INSERT INTO ledger_entries
          (company_id, entry_date, source_type, source_id, ledger_id, party_id, debit, credit, narration)
          VALUES (?, ?, 'TDS_PAYMENT', ?, ?, ?, 0, ?, ?)`,
          [
            company_id,
            transaction_date || new Date(),
            `TD-${taxDutyId}`,
            paymentLedgerId,
            party_id,
            totalTds,
            `TDS Paid for ${party_name}`,
          ],
        );
      }
    }

    await conn.commit();

    res.json({
      success: true,
      tax_duty_id: taxDutyId,
      message: "TDS payment recorded successfully",
    });
  } catch (err) {
    await conn.rollback();

    console.error("Create Tax Duty Error:", err);

    res.status(500).json({
      success: false,
      error: "Failed to create tax duty",
    });
  } finally {
    conn.release();
  }
};

exports.getTaxDuties = async (req, res) => {
  try {

    const { company_id } = req.query;

    const [rows] = await db.execute(
      `
SELECT
  td.*,
  p.company_name AS party_name,
  g.name AS group_name,

  pb.supplier_invoice_no AS purchase_invoice_no,
  e.bill_number AS expense_bill_no,

  b.bank_name,

  CASE 
    WHEN pb.supplier_invoice_no IS NOT NULL THEN 'PURCHASE'
    WHEN e.bill_number IS NOT NULL THEN 'EXPENSE'
    ELSE '-'
  END AS bill_type

FROM tax_duties td

LEFT JOIN party p
  ON p.id = td.party_id

LEFT JOIN groups_master g
  ON g.id = td.group_id

LEFT JOIN banks_master b
 ON b.id = td.bank_name

LEFT JOIN purchase_bill pb
  ON pb.supplier_invoice_no = td.purchase_invoice_no

LEFT JOIN expenses e
  ON e.bill_number = td.purchase_invoice_no

WHERE td.company_id = ?
AND td.deleted_at IS NULL

ORDER BY td.id DESC
`,
      [company_id]
    );

    res.json(rows);

  } catch (err) {

    console.error("List Tax Duties Error:", err);

    res.status(500).json({
      error: err.message
    });

  }
};

/* ================= SINGLE TAX DUTY ================= */
exports.getTaxDutyById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT
        td.*,
        p.company_name AS party_name,
        g.name AS group_name

      FROM tax_duties td

      LEFT JOIN party p
      ON p.id = td.party_id

      LEFT JOIN groups_master g
      ON g.id = td.group_id

      WHERE td.id=?`,
      [id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Get Tax Duty Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= UPDATE TAX DUTY ================= */
exports.updateTaxDuty = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      party_id,
      group_id,
      purchase_invoice_no,
      tds,
      payment_type,
      bank_name,
      payment_mode,
      cheque_number,
      cheque_date,
      transaction_date,
      narration,
    } = req.body;

    await db.execute(
      `UPDATE tax_duties SET

      party_id=?,
      group_id=?,
      purchase_invoice_no=?,
      tds=?,
      payment_type=?,
      bank_name=?,
      payment_mode=?,
      cheque_number=?,
      cheque_date=?,
      transaction_date=?,
      narration=?

      WHERE id=?`,
      [
        party_id,
        group_id,
        purchase_invoice_no || null,
        tds || 0,
        payment_type || "CASH",
        bank_name || null,
        payment_mode || null,
        cheque_number || null,
        cheque_date || null,
        transaction_date || null,
        narration || null,
        id,
      ],
    );

    res.json({
      success: true,
      message: "Tax Duty Updated Successfully",
    });
  } catch (err) {
    console.error("Update Tax Duty Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= DELETE TAX DUTY ================= */
exports.deleteTaxDuty = async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      `UPDATE tax_duties
       SET deleted_at = NOW()
       WHERE id=?`,
      [id],
    );

    res.json({
      success: true,
      message: "Tax Duty Deleted Successfully",
    });
  } catch (err) {
    console.error("Delete Tax Duty Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET DUTIES & TAXES GROUP ================= */
exports.getDutiesGroups = async (req, res) => {
  try {
    const { company_id } = req.query;

    const [rows] = await db.execute(
      `SELECT id, name
      FROM groups_master
      WHERE company_id=?
      AND name='Duties & Taxes'
      AND deleted_at IS NULL`,
      [company_id],
    );

    res.json(rows);
  } catch (err) {
    console.error("Get Duties Group Error:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.getTdsInvoicesByParty = async (req, res) => {
  try {

    const { company_id, party_id } = req.query;

    const [rows] = await db.query(
      `
SELECT
  pbt.id,
  pb.supplier_invoice_no AS invoice_no,
  pbt.tds_amount,
  pbt.paid_status,
  'PURCHASE' AS type
FROM purchase_bill_tds pbt
JOIN purchase_bill pb
  ON pb.id = pbt.purchase_bill_id
WHERE pbt.party_id = ?
AND pb.company_id = ?

UNION ALL

SELECT
  pbt.id,
  COALESCE(e.bill_number, e.voucher_number) AS invoice_no,
  pbt.tds_amount,
  pbt.paid_status,
  'EXPENSE' AS type
FROM purchase_bill_tds pbt
JOIN expenses e
  ON e.id = pbt.expense_id
WHERE pbt.party_id = ?
AND e.company_id = ?
`,
      [party_id, company_id, party_id, company_id],
    );

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};