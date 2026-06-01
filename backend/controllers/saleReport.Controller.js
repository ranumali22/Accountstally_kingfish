const db = require("../config/db");

exports.getSaleReport = async (req, res) => {
  try {
    const { company_id, fromDate, toDate, search } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id required",
      });
    }

    let where = `WHERE sb.company_id=? AND sb.status='active'`;
    const params = [company_id];

    if (fromDate) {
      where += ` AND sb.voucher_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      where += ` AND sb.voucher_date <= ?`;
      params.push(toDate);
    }

    if (search) {
      where += ` AND (sb.invoice_no LIKE ? OR p.company_name LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like);
    }

    const [rows] = await db.query(
      `
      SELECT
        sb.id,
        sb.invoice_no,
        sb.voucher_date,
        sb.mode,
        sb.bank_id,

        /* COMPANY */
        sb.company_name,
        sb.company_gst_no,
        sb.company_address,
        sb.company_city,
        sb.company_state,
        sb.company_pincode,

        /* PARTY */
        p.id AS party_id,
        p.company_name AS party_name,
        p.gst_number AS party_gstin,
        p.address AS party_address,
        p.email AS party_email,
        p.mobile_number AS party_mobile,

        sb.total_amount,

        /* ✅ CORRECT PAYMENT (ONLY FROM PARTY LEDGER) */
        COALESCE(SUM(le.credit), 0) AS received_amount,

        /* ✅ CORRECT DUE */
        sb.total_amount - COALESCE(SUM(le.credit), 0) AS due_amount

      FROM sale_bill sb
      LEFT JOIN party p ON p.id = sb.party_id
      
      /* JOIN ONLY PARTY'S CREDIT ENTRIES (ROBUST FOR OLD & NEW DATA) */
      LEFT JOIN ledger_entries le
        ON le.source_id = sb.invoice_no
        AND le.source_type = 'SALE_BILL'
        AND le.company_id = sb.company_id
        AND le.credit > 0
        AND (
          le.ledger_id = sb.party_id 
          OR le.ledger_id IN (SELECT id FROM ledgers WHERE party_id = sb.party_id AND company_id = sb.company_id)
        )
        /* EXCLUDE SALES ACCOUNT CREDIT */
        AND le.ledger_id NOT IN (SELECT id FROM groups_master WHERE name = 'Sales Accounts' AND company_id = sb.company_id)

      ${where}
      GROUP BY sb.id
      ORDER BY sb.voucher_date DESC
      `,
      params
    );

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};