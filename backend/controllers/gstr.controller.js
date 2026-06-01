const db = require("../config/db");

// GSTR-1 : Sales GST Report
exports.getGSTR1 = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "From and To date required",
      });
    }

const [rows] = await db.query(
  `
  SELECT
    s.invoice_no,
    s.voucher_date,
    p.company_name,
    p.gst_number,
    si.hsn,
    si.tax_percent,

    SUM(si.amount - si.tax_amount) AS taxable_value,
    SUM(si.tax_amount) AS gst_amount,
    SUM(si.amount) AS invoice_value

  FROM sale_bill s

  LEFT JOIN sale_bill_item si
    ON si.sale_bill_id = s.id

  LEFT JOIN party p
    ON p.id = s.party_id

  WHERE s.status = 'active'
  AND si.status = 'active'
  AND s.voucher_date BETWEEN ? AND ?

  GROUP BY
    s.invoice_no,
    si.hsn,
    si.tax_percent

  ORDER BY s.voucher_date DESC
  `,
  [from, to]
);

    res.json({
      success: true,
      report: "GSTR-1",
      data: rows,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error fetching GSTR-1",
    });
  }
};

// GSTR-2B : Purchase GST Report
exports.getGSTR2B = async (req, res) => {
  try {
    const { from, to } = req.query;

 const [rows] = await db.query(
  `
  SELECT
    pb.supplier_invoice_no,
    pb.voucher_date,
    pt.company_name,
    pt.gst_number,
    pi.hsn,
    pi.tax_percent,

    SUM(pi.amount - pi.tax_amount) AS taxable_value,
    SUM(pi.tax_amount) AS gst_amount,
    SUM(pi.amount) AS invoice_value

  FROM purchase_bill pb

  LEFT JOIN purchase_bill_item pi
    ON pi.purchase_bill_id = pb.id

  LEFT JOIN party pt
    ON pt.id = pb.party_id

  WHERE pb.status = 'active'
  AND pi.status = 'active'
  AND pb.voucher_date BETWEEN ? AND ?

  GROUP BY
    pb.supplier_invoice_no,
    pi.hsn,
    pi.tax_percent

  ORDER BY pb.voucher_date DESC
  `,
  [from, to]
);

    res.json({
      success: true,
      report: "GSTR-2B",
      data: rows,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error fetching GSTR-2B",
    });
  }
};

// GSTR-3B : GST Summary Report
exports.getGSTR3B = async (req, res) => {
  try {
    const { from, to } = req.query;

  const [[sales]] = await db.query(
  `
  SELECT
    SUM(si.amount - si.tax_amount) AS taxable_value,
    SUM(si.tax_amount) AS output_gst
  FROM sale_bill s
  LEFT JOIN sale_bill_item si ON si.sale_bill_id = s.id
  WHERE s.status='active'
  AND si.status='active'
  AND s.voucher_date BETWEEN ? AND ?
  `,
  [from, to]
);

const [[purchase]] = await db.query(
  `
  SELECT
    SUM(pi.amount - pi.tax_amount) AS taxable_value,
    SUM(pi.tax_amount) AS input_gst
  FROM purchase_bill pb
  LEFT JOIN purchase_bill_item pi ON pi.purchase_bill_id = pb.id
  WHERE pb.status='active'
  AND pi.status='active'
  AND pb.voucher_date BETWEEN ? AND ?
  `,
  [from, to]
);

    const net_gst = (sales.output_gst || 0) - (purchase.input_gst || 0);

    res.json({
      success: true,
      report: "GSTR-3B",
      data: {
        sales,
        purchase,
        net_gst,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error fetching GSTR-3B",
    });
  }
};

// GSTR-9 : Annual GST Report (FIXED)
exports.getGSTR9 = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year required",
      });
    }

    // Financial year range
    const startDate = `${year}-04-01`;
    const endDate = `${parseInt(year) + 1}-03-31`;

    // SALES
  const [[sales]] = await db.query(
  `
  SELECT
    SUM(si.amount - si.tax_amount) AS taxable_value,
    SUM(si.tax_amount) AS output_gst,
    SUM(si.amount) AS total_sales
  FROM sale_bill s
  LEFT JOIN sale_bill_item si 
    ON si.sale_bill_id = s.id
  WHERE s.status = 'active'
  AND si.status = 'active'
  AND s.voucher_date BETWEEN ? AND ?
  `,
  [startDate, endDate]
);
    // PURCHASE
 const [[purchase]] = await db.query(
  `
  SELECT
    SUM(pi.amount - pi.tax_amount) AS taxable_value,
    SUM(pi.tax_amount) AS input_gst,
    SUM(pi.amount) AS total_purchase
  FROM purchase_bill pb
  LEFT JOIN purchase_bill_item pi 
    ON pi.purchase_bill_id = pb.id
  WHERE pb.status = 'active'
  AND pi.status = 'active'
  AND pb.voucher_date BETWEEN ? AND ?
  `,
  [startDate, endDate]
);

    const outputGST = sales.output_gst || 0;
    const inputGST = purchase.input_gst || 0;

    const net_gst = outputGST - inputGST;

    res.json({
      success: true,
      report: "GSTR-9",
      financial_year: `${year}-${parseInt(year) + 1}`,
      data: {
        sales,
        purchase,
        net_gst,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error fetching GSTR-9",
    });
  }
};
