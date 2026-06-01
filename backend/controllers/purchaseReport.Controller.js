// const db = require("../config/db");
// exports.getPurchaseReport = async (req, res) => {
//   try {
//     const { company_id, fromDate, toDate, search } = req.query;

//     if (!company_id) {
//       return res.status(400).json({
//         success: false,
//         message: "company_id required",
//       });
//     }

//     let where = `WHERE pb.company_id=? AND pb.status='active'`;
//     const params = [company_id];

//     if (fromDate) {
//       where += ` AND pb.voucher_date >= ?`;
//       params.push(fromDate);
//     }

//     if (toDate) {
//       where += ` AND pb.voucher_date <= ?`;
//       params.push(toDate);
//     }

//     if (search) {
//       where += `
//         AND (
//           pb.supplier_invoice_no LIKE ?
//           OR p.company_name LIKE ?
//         )
//       `;
//       const like = `%${search}%`;
//       params.push(like, like);
//     }

//     const [rows] = await db.query(
//       `
// SELECT
//   pb.id,
//   pb.supplier_invoice_no AS invoice_no,
//   pb.voucher_date,
//   pb.mode,

//   p.id AS party_id,
//   p.company_name AS party_name,
//   p.mobile_number,

//   pb.total_amount,

//   /* ✅ PAID (ONLY THIS BILL) */
//   COALESCE(SUM(
//     CASE
//       WHEN le.debit > 0
//       AND le.source_type = 'PURCHASE_BILL'
//       AND le.source_id = pb.supplier_invoice_no
//       THEN le.debit
//       ELSE 0
//     END
//   ),0) AS paid_amount,

//   COALESCE(tds.tds_amount,0) AS tds_amount,

//   /* ✅ DUE */
//   pb.total_amount
//   - COALESCE(SUM(
//       CASE
//         WHEN le.debit > 0
//         AND le.source_type = 'PURCHASE_BILL'
//         AND le.source_id = pb.supplier_invoice_no
//         THEN le.debit
//         ELSE 0
//       END
//     ),0)
//   - COALESCE(tds.tds_amount,0) AS due_amount

// FROM purchase_bill pb

// LEFT JOIN party p
// ON p.id = pb.party_id

// /* 🔥 FIXED JOIN (IMPORTANT) */
// LEFT JOIN ledger_entries le
// ON le.company_id = pb.company_id
// AND le.source_id = pb.supplier_invoice_no

// LEFT JOIN purchase_bill_tds tds
// ON tds.purchase_bill_id = pb.id
// AND tds.status='active'

// ${where}

// GROUP BY pb.id
// ORDER BY pb.voucher_date DESC
//       `,
//       params
//     );

//     res.json({
//       success: true,
//       data: rows,
//     });
//   } catch (err) {
//     console.error("Purchase Report Error:", err);

//     res.status(500).json({
//       success: false,
//       error: "Failed to fetch purchase report",
//     });
//   }
// };

const db = require("../config/db");

exports.getPurchaseReport = async (req, res) => {
  try {
    const { company_id, fromDate, toDate, search } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "company_id required",
      });
    }

    let where = `WHERE pb.company_id=? AND pb.status='active'`;
    const params = [company_id];

    /* ================= DATE FILTER ================= */
    if (fromDate) {
      where += ` AND pb.voucher_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      where += ` AND pb.voucher_date <= ?`;
      params.push(toDate);
    }

    /* ================= SEARCH ================= */
    if (search) {
      where += `
        AND (
          pb.supplier_invoice_no LIKE ?
          OR p.company_name LIKE ?
        )
      `;
      const like = `%${search}%`;
      params.push(like, like);
    }

    /* ================= FETCH HEADER ================= */
    const [bills] = await db.query(
      `
      SELECT
        pb.id AS bill_id,
        pb.supplier_invoice_no,
        pb.voucher_date,
        pb.mode,
        pb.total_amount,
        pb.narration,
        pb.document,
        pb.payment_type,

        p.id AS party_id,
        p.company_name AS party_name,
        p.gst_number AS party_gstin,
        p.mobile_number AS party_mobile,
        p.address AS party_address,
        p.state AS party_state,
        p.city AS party_city,
        p.pincode AS party_pincode,

        /* DYNAMIC CALCULATION */
        COALESCE(payments.total_paid, 0) AS paid_amount,
        COALESCE(tds_payments.total_tds, 0) AS tds_amount,
        pb.total_amount - COALESCE(payments.total_paid, 0) - COALESCE(tds_payments.total_tds, 0) AS due_amount

      FROM purchase_bill pb
      LEFT JOIN party p ON p.id = pb.party_id
      LEFT JOIN (
        /* SUBQUERY TO GET ACCURATE PAYMENTS PER PURCHASE BILL */
        SELECT 
          le.source_id,
          le.company_id,
          le.party_id,
          SUM(le.debit) AS total_paid
        FROM ledger_entries le
        WHERE le.source_type = 'PURCHASE_BILL' 
          AND le.debit > 0
        GROUP BY le.source_id, le.company_id, le.party_id
      ) payments ON payments.source_id = pb.supplier_invoice_no 
                AND payments.company_id = pb.company_id 
                AND payments.party_id = pb.party_id
      LEFT JOIN (
        /* SUBQUERY TO GET TDS PER PURCHASE BILL */
        SELECT 
          le.source_id,
          le.company_id,
          le.party_id,
          SUM(le.debit) AS total_tds
        FROM ledger_entries le
        WHERE le.source_type = 'PURCHASE_TDS' 
          AND le.debit > 0
        GROUP BY le.source_id, le.company_id, le.party_id
      ) tds_payments ON tds_payments.source_id = pb.supplier_invoice_no 
                    AND tds_payments.company_id = pb.company_id 
                    AND tds_payments.party_id = pb.party_id

      ${where}

      ORDER BY pb.voucher_date DESC
      `,
      params
    );

    /* ================= FETCH ITEMS ================= */
    for (const bill of bills) {
      const [items] = await db.query(
        `
        SELECT
          item_name,
          hsn,
          qty,
          price_per_unit,
          tax_amount,
          amount
        FROM purchase_bill_item
        WHERE purchase_bill_id = ?
        AND status = 'active'
        ORDER BY id ASC
        `,
        [bill.bill_id]
      );

      bill.rows = items; // 🔥 IMPORTANT (frontend yahi use karega)
    }

    /* ================= FINAL RESPONSE ================= */
    res.json({
      success: true,
      data: bills,
    });

  } catch (err) {
    console.error("Purchase Report Error:", err);

    res.status(500).json({
      success: false,
      error: "Failed to fetch purchase report",
    });
  }
};

