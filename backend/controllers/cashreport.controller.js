const db = require("../config/db");
exports.getCashReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const company_id = req.company_id;

    let dateFilter = "";
    const params = [company_id];

    if (fromDate && toDate) {
      dateFilter = "AND voucher_date BETWEEN ? AND ?";
      params.push(fromDate, toDate);
    }

    // 1️⃣ SALE CASH

    const [sales] = await db.query(
      `
  SELECT 
    'SALE' as type,
    s.id,
    s.invoice_no as voucher_no,
    s.voucher_date as date,
    p.company_name as party_name,
    s.total_amount as amount,
    'IN' as flow
  FROM sale_bill s
  LEFT JOIN party p ON p.id = s.party_id
  WHERE s.company_id = ?
  AND s.payment_type = 'Cash'
  ${dateFilter}
  AND s.status = 'active'
  `,
      params,
    );

    // 2️⃣ PURCHASE CASH

    const [purchase] = await db.query(
      `
  SELECT 
    'PURCHASE' as type,
    pb.id,
    pb.supplier_invoice_no as voucher_no,
    pb.voucher_date as date,
    p.company_name as party_name,
    pb.total_amount as amount,
    'OUT' as flow
  FROM purchase_bill pb
  LEFT JOIN party p ON p.id = pb.party_id
  WHERE pb.company_id = ?
  AND pb.payment_type = 'Cash'
  ${dateFilter}
  AND pb.status = 'active'
  `,
      params,
    );

    // 3️⃣ EXPENSE CASH
    // 3️⃣ EXPENSE CASH

    const expenseFilter =
      fromDate && toDate ? "AND expense_date BETWEEN ? AND ?" : "";

    const expenseParams =
      fromDate && toDate ? [company_id, fromDate, toDate] : [company_id];

    const [expenses] = await db.query(
      `
  SELECT 
    'EXPENSE' as type,
    e.id,
    e.voucher_number as voucher_no,
    e.expense_date as date,
    p.company_name as party_name,
    e.amount,
    'OUT' as flow
  FROM expenses e
  LEFT JOIN party p ON p.id = e.party_id
  WHERE e.company_id = ?
  AND e.payment_type = 'CASH'
  ${expenseFilter}
  AND e.status = 1
  `,
      expenseParams,
    );

    // 4️⃣ RECEIPT VOUCHER

    const [receipts] = await db.query(
      `
  SELECT 
    'RECEIPT' as type,
    v.id,
    v.voucher_no,
    v.voucher_date as date,
    p.company_name as party_name,
    v.payment_amount as amount,
    'IN' as flow
  FROM vouchers v
  LEFT JOIN party p ON p.id = v.party_id
  WHERE v.company_id = ?
  AND v.voucher_type = 'RECEIPT'
  AND v.payment_type = 'CASH'
  ${dateFilter}
  AND v.status = 'active'
  `,
      params,
    );

    // 5️⃣ PAYMENT VOUCHER

    const [payments] = await db.query(
      `
  SELECT 
    'PAYMENT' as type,
    v.id,
    v.voucher_no,
    v.voucher_date as date,
    p.company_name as party_name,
    v.payment_amount as amount,
    'OUT' as flow
  FROM vouchers v
  LEFT JOIN party p ON p.id = v.party_id
  WHERE v.company_id = ?
  AND v.voucher_type = 'PAYMENT'
  AND v.payment_type = 'CASH'
  ${dateFilter}
  AND v.status = 'active'
  `,
      params,
    );

    // 6️⃣ JOURNAL CASH ENTRY

    const [journalCash] = await db.query(
      `
  SELECT 
    'JOURNAL_VOUCHER' as type,
    j.id,
    j.voucher_no,
    j.voucher_date as date,
    p.company_name as party_name,
    j.amount,
    CASE 
        WHEN j.paid > 0 THEN 'OUT'
        ELSE 'IN'
    END as flow
  FROM jurnal_voucher j
  LEFT JOIN party p ON p.id = j.party_id
  WHERE j.company_id = ?
  AND j.payment_type = 'CASH'
  ${dateFilter}
  `,
      params,
    );

    // 🔥 Merge All Data
    let allData = [
      ...sales,
      ...purchase,
      ...expenses,
      ...receipts,
      ...payments,
      ...journalCash,
    ];

    // Date wise sort
    allData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Running Balance
    let balance = 0;
    allData = allData.map((row) => {
      if (row.flow === "IN") {
        balance += Number(row.amount);
      } else {
        balance -= Number(row.amount);
      }

      return {
        ...row,
        balance,
      };
    });

    res.json({
      success: true,
      data: allData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
