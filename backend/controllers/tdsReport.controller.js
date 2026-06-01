const db = require("../config/db");

exports.getTdsReport = async (req, res) => {
  try {
    const { company_id, fromDate, toDate } = req.query;

    if (!company_id) {
      return res.status(400).json({ message: "company_id is required" });
    }

    // Dynamic filtering parameters
    const params = [company_id, fromDate, toDate];

    const [rows] = await db.query(
      `
      SELECT
        pbt.id,
        pbt.party_id,
        py.company_name AS party_name,
        pbt.purchase_bill_id,
        pbt.expense_id,
        pbt.tds_percent,
        pbt.tds_on_amount,
        pbt.tds_amount,
        pbt.paid_status,
        
        /* Parent Bill Info */
        COALESCE(pb.voucher_date, ex.expense_date) AS transaction_date,
        pb.supplier_invoice_no AS purchase_bill_no,
        ex.voucher_number AS expense_bill_no,
        COALESCE(pb.payment_type, ex.payment_type) AS payment_type,
        bm.bank_name

      FROM purchase_bill_tds pbt
      INNER JOIN party py ON py.id = pbt.party_id
      LEFT JOIN purchase_bill pb ON pb.id = pbt.purchase_bill_id
      LEFT JOIN expenses ex ON ex.id = pbt.expense_id
      LEFT JOIN banks_master bm ON bm.id = COALESCE(pb.bank_name, ex.bank_id)

      WHERE pbt.status = 'active'
        AND py.company_id = ?
        AND COALESCE(pb.voucher_date, ex.expense_date) BETWEEN ? AND ?

      ORDER BY COALESCE(pb.voucher_date, ex.expense_date) DESC, pbt.id DESC
      `,
      params,
    );

    const [[summary]] = await db.query(
      `
      SELECT
        SUM(pbt.tds_amount) AS total_tds,
        SUM(CASE WHEN pbt.paid_status = 'PAID' THEN pbt.tds_amount ELSE 0 END) AS paid_tds,
        SUM(CASE WHEN pbt.paid_status = 'PENDING' THEN pbt.tds_amount ELSE 0 END) AS pending_tds,
        SUM(CASE WHEN pbt.purchase_bill_id IS NOT NULL THEN pbt.tds_amount ELSE 0 END) AS purchase_tds,
        SUM(CASE WHEN pbt.expense_id IS NOT NULL THEN pbt.tds_amount ELSE 0 END) AS expense_tds
      FROM purchase_bill_tds pbt
      INNER JOIN party py ON py.id = pbt.party_id
      LEFT JOIN purchase_bill pb ON pb.id = pbt.purchase_bill_id
      LEFT JOIN expenses ex ON ex.id = pbt.expense_id
      WHERE pbt.status = 'active'
        AND py.company_id = ?
        AND COALESCE(pb.voucher_date, ex.expense_date) BETWEEN ? AND ?
      `,
      params,
    );

    res.json({
      success: true,
      summary: summary || {
        total_tds: 0,
        paid_tds: 0,
        pending_tds: 0,
        purchase_tds: 0,
        expense_tds: 0,
      },
      data: rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to load TDS report",
    });
  }
};
