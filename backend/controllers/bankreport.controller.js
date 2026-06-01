const db = require("../config/db");

exports.getBankReport = async (req, res) => {
  try {
    const { fromDate, toDate, bank_id } = req.query;
    const company_id = req.company_id;

    let dateFilter = "";

    if (!bank_id) {
      return res.json({
        success: true,
        openingBalance: 0,
        closingBalance: 0,
        data: [],
      });
    }

    const params = bank_id
      ? [
          company_id,
          fromDate,
          bank_id,
          company_id,
          fromDate,
          bank_id,
          company_id,
          fromDate,
          bank_id,
        ]
      : [company_id, fromDate, company_id, fromDate, company_id, fromDate];

    let saleFilter = "";
    let saleParams = [company_id];

    if (toDate) {
      saleFilter += " AND s.voucher_date <= ?";
      saleParams.push(toDate);
    }

    if (bank_id !== undefined && bank_id !== "") {
      saleFilter += " AND s.bank_id = ?";
      saleParams.push(bank_id);
    }

    let openingBalance = 0;

    if (bank_id !== undefined && bank_id !== "") {
      const [bankRow] = await db.query(
        `SELECT opening_balance, balance_type FROM banks_master WHERE id = ?`,
        [bank_id],
      );

      if (bankRow.length) {
        const ob = Number(bankRow[0].opening_balance || 0);

        openingBalance = bankRow[0].balance_type === "Dr" ? ob : -ob;
      }
    }

    const [sales] = await db.query(
      `
  SELECT 
    'SALE' as type,
    s.id,
    s.invoice_no as voucher_no,
    s.voucher_date as date,
    p.company_name as party_name,
    b.bank_name,

    s.paid_amount as amount,
    'IN' as flow
  FROM sale_bill s
  LEFT JOIN party p ON p.id = s.party_id
  LEFT JOIN banks_master b ON b.id = s.bank_id
  WHERE s.company_id = ?
  AND s.payment_type = 'Bank'
  AND s.paid_amount > 0
  ${saleFilter}
  AND s.status = 'active'
  `,
      saleParams,
    );

    let purchaseFilter = "";
    let purchaseParams = [company_id];

    if (toDate) {
      purchaseFilter += " AND pb.voucher_date <= ?";
      purchaseParams.push(toDate);
    }

    if (bank_id !== undefined && bank_id !== "") {
      purchaseFilter += " AND pb.bank_name = ?";
      purchaseParams.push(bank_id);
    }

    const [purchase] = await db.query(
      `
SELECT 
  'PURCHASE' as type,
  pb.id,
  pb.supplier_invoice_no as voucher_no,
  pb.voucher_date as date,
  p.company_name as party_name,
  b.bank_name,
  pb.paid_amount as amount,
  'OUT' as flow
FROM purchase_bill pb
LEFT JOIN party p ON p.id = pb.party_id
LEFT JOIN banks_master b ON b.id = pb.bank_name
WHERE pb.company_id = ?
AND pb.payment_type = 'Bank'
AND pb.paid_amount > 0
${purchaseFilter}
AND pb.status = 'active'
  `,
      purchaseParams,
    );

    let expenseFilter = "";
    let expenseParams = [company_id];

    if (toDate) {
      expenseFilter += " AND e.expense_date <= ?";
      expenseParams.push(toDate);
    }
    if (bank_id !== undefined && bank_id !== "") {
      expenseFilter += " AND e.bank_id = ?";
      expenseParams.push(bank_id);
    }

    const [expenses] = await db.query(
      `
  SELECT 
    'EXPENSE' as type,
    e.id,
    e.voucher_number as voucher_no,
    e.expense_date as date,
    p.company_name as party_name,
    b.bank_name,
    e.amount,
    'OUT' as flow
  FROM expenses e
  LEFT JOIN party p ON p.id = e.party_id
  LEFT JOIN banks_master b ON b.id = e.bank_id
  WHERE e.company_id = ?
  AND e.payment_type = 'BANK'
  ${expenseFilter}
  AND e.status = 1
  `,
      expenseParams,
    );

    let receiptFilter = "";
    let receiptParams = [company_id];

    if (toDate) {
      receiptFilter += " AND v.voucher_date <= ?";
      receiptParams.push(toDate);
    }
    if (bank_id !== undefined && bank_id !== "") {
      receiptFilter += " AND v.bank_id = ?";
      receiptParams.push(bank_id);
    }

    const [receipts] = await db.query(
      `
  SELECT 
    'RECEIPT' as type,
    v.id,
    v.voucher_no,
    v.voucher_date as date,
    p.company_name as party_name,
    b.bank_name,
    v.payment_amount as amount,
    'IN' as flow
  FROM vouchers v
  LEFT JOIN party p ON p.id = v.party_id
  LEFT JOIN banks_master b ON b.id = v.bank_id
  WHERE v.company_id = ?
  AND v.voucher_type = 'RECEIPT'
  AND v.payment_type = 'BANK'
  ${receiptFilter}
  AND v.status = 'active'
  `,
      receiptParams,
    );
    /* ================= PAYMENT ================= */
    let paymentsFilter = "";
    let paymentsParams = [company_id];

    if (toDate) {
      paymentsFilter += " AND v.voucher_date <= ?";
      paymentsParams.push(toDate);
    }
    if (bank_id !== undefined && bank_id !== "") {
      paymentsFilter += " AND v.bank_id = ?";
      paymentsParams.push(bank_id);
    }

    const [payments] = await db.query(
      `
  SELECT 
    'PAYMENT' as type,
    v.id,
    v.voucher_no,
    v.voucher_date as date,
    p.company_name as party_name,
    b.bank_name,
    v.payment_amount as amount,
    'OUT' as flow
  FROM vouchers v
  LEFT JOIN party p ON p.id = v.party_id
  LEFT JOIN banks_master b ON b.id = v.bank_id
  WHERE v.company_id = ?
  AND v.voucher_type = 'PAYMENT'
  AND v.payment_type = 'BANK'
  ${paymentsFilter}
  AND v.status = 'active'
  `,
      paymentsParams,
    );

    let journalFilter = "";
    let journalParams = [company_id];

    if (toDate) {
      journalFilter += " AND j.voucher_date <= ?";
      journalParams.push(toDate);
    }
    if (bank_id !== undefined && bank_id !== "") {
      journalFilter += " AND j.bank_id = ?";
      journalParams.push(bank_id);
    }

    const [journalCash] = await db.query(
      `
  SELECT 
    'JOURNAL_VOUCHER' as type,
    j.id,
    j.voucher_no,
    j.voucher_date as date,
    p.company_name as party_name,
    b.bank_name,
    j.amount,
    CASE 
      WHEN j.paid > 0 THEN 'OUT'
      ELSE 'IN'
    END as flow
  FROM jurnal_voucher j
  LEFT JOIN party p ON p.id = j.party_id
  LEFT JOIN banks_master b ON b.id = j.bank_id
  WHERE j.company_id = ?
  AND j.payment_type = 'BANK'
  AND j.status = 'active'
  ${journalFilter}
  `,
      journalParams,
    );

    let thirdPartyFilter = "";
    let thirdPartyParams = [company_id];

    if (toDate) {
      thirdPartyFilter += " AND j.voucher_date <= ?";
      thirdPartyParams.push(toDate);
    }
    if (bank_id !== undefined && bank_id !== "") {
      thirdPartyFilter += " AND j.bank_id = ?";
      thirdPartyParams.push(bank_id);
    }

    const [thirdPartyBank] = await db.query(
      `
      SELECT 
        'THIRDPARTY_VOUCHER' as type,
        j.id,
        j.voucher_no,
        j.voucher_date as date,
        p.company_name as party_name,
        b.bank_name,
        j.paid_amount as amount,
        CASE 
          WHEN j.voucher_type = 'thirdparty_payment' THEN 'OUT'
          ELSE 'IN'
        END as flow
      FROM third_party_voucher j
      LEFT JOIN party p ON p.id = j.party_id
      LEFT JOIN banks_master b ON b.id = j.bank_id
      WHERE j.company_id = ?
      AND (LOWER(j.payment_type) = 'bank' OR j.payment_type = 'BANK')
      AND j.status = 'active'
      ${thirdPartyFilter}
      `,
      thirdPartyParams
    );

    let contraFilter = "";
    let contraParams = [company_id];

    if (toDate) {
      contraFilter += " AND c.transaction_date <= ?";
      contraParams.push(toDate);
    }

    if (bank_id !== undefined && bank_id !== "") {
      contraFilter += " AND c.bank_id = ?";
      contraParams.push(bank_id);
    }

    let contraSql = `
  SELECT 
    'CONTRA' as type,
    c.id,
    c.contra_no as voucher_no,
    c.transaction_date as date,
    'BANK' as party_name,
    b.bank_name,
    c.amount,
    CASE 
      WHEN c.entry_type = 'Dr' THEN 'OUT'
      ELSE 'IN'
    END as flow
  FROM contra c
  LEFT JOIN banks_master b ON b.id = c.bank_id
  WHERE (c.company_id = ? OR c.company_id IS NULL)
  AND c.status = 'active'
  `;
    if (contraFilter) contraSql += contraFilter;
    const [contra] = await db.query(contraSql, contraParams);

    let allData = [
      ...sales,
      ...purchase,
      ...expenses,
      ...receipts,
      ...payments,
      ...journalCash,
      ...thirdPartyBank,
      ...contra,
    ];

    const toDateString = (dateInput) => {
      if (!dateInput) return "";
      if (typeof dateInput === 'string') {
        const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
      }
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    allData.sort((a, b) => {
      const dateA = toDateString(a.date);
      const dateB = toDateString(b.date);
      return dateA.localeCompare(dateB);
    });

    let balance = openingBalance;
    let calculatedOpeningBalance = openingBalance;

    const finalData = [];
    const fromDateStr = toDateString(fromDate);

    allData.forEach((row) => {
      const rowDateStr = toDateString(row.date);
      
      if (fromDateStr && rowDateStr < fromDateStr) {
         if (row.flow === "IN") calculatedOpeningBalance += Number(row.amount);
         else calculatedOpeningBalance -= Number(row.amount);
         balance = calculatedOpeningBalance;
      } else {
         if (row.flow === "IN") balance += Number(row.amount);
         else balance -= Number(row.amount);
         finalData.push({ ...row, balance });
      }
    });

    if (bank_id) {
      finalData.unshift({
        date: fromDateStr || (finalData.length > 0 ? toDateString(finalData[0].date) : toDateString(new Date())),
        type: "OPENING",
        voucher_no: "-",
        party_name: "-",
        bank_name: "-",
        amount: Math.abs(calculatedOpeningBalance),
        flow: calculatedOpeningBalance >= 0 ? "IN" : "OUT",
        balance: calculatedOpeningBalance,
      });
    }

    res.json({
      success: true,
      openingBalance: calculatedOpeningBalance,
      closingBalance: balance,
      data: finalData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
