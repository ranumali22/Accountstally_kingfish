const db = require("../config/db");

exports.getBankBalance = async (conn, company_id, bank_id) => {
  // 1. Get Opening Balance
  let openingBalance = 0;
  const [bankRow] = await conn.query(
    `SELECT opening_balance, balance_type FROM banks_master WHERE id = ? AND company_id = ?`,
    [bank_id, company_id]
  );
  
  if (bankRow.length) {
    const ob = Number(bankRow[0].opening_balance || 0);
    openingBalance = bankRow[0].balance_type === "Dr" ? ob : -ob;
  } else {
      return 0; // Bank not found
  }

  // 2. Calculate Total IN
  const [[inResult]] = await conn.query(
    `SELECT 
      (SELECT IFNULL(SUM(paid_amount), 0) FROM sale_bill WHERE company_id = ? AND bank_id = ? AND payment_type = 'Bank' AND status = 'active') +
      (SELECT IFNULL(SUM(payment_amount), 0) FROM vouchers WHERE company_id = ? AND bank_id = ? AND voucher_type = 'RECEIPT' AND payment_type = 'BANK' AND status = 'active') +
      (SELECT IFNULL(SUM(amount), 0) FROM jurnal_voucher WHERE company_id = ? AND bank_id = ? AND payment_type = 'BANK' AND status = 'active' AND (paid IS NULL OR paid = 0)) +
      (SELECT IFNULL(SUM(amount), 0) FROM contra WHERE company_id = ? AND bank_id = ? AND status = 'active' AND entry_type != 'Dr')
      AS total_in`,
    [company_id, bank_id, company_id, bank_id, company_id, bank_id, company_id, bank_id]
  );

  // 3. Calculate Total OUT
  const [[outResult]] = await conn.query(
    `SELECT 
      (SELECT IFNULL(SUM(paid_amount), 0) FROM purchase_bill WHERE company_id = ? AND bank_name = ? AND payment_type = 'Bank' AND status = 'active') +
      (SELECT IFNULL(SUM(amount), 0) FROM expenses WHERE company_id = ? AND bank_id = ? AND payment_type = 'BANK' AND status = 1) +
      (SELECT IFNULL(SUM(payment_amount), 0) FROM vouchers WHERE company_id = ? AND bank_id = ? AND voucher_type = 'PAYMENT' AND payment_type = 'BANK' AND status = 'active') +
      (SELECT IFNULL(SUM(amount), 0) FROM jurnal_voucher WHERE company_id = ? AND bank_id = ? AND payment_type = 'BANK' AND status = 'active' AND paid > 0) +
      (SELECT IFNULL(SUM(amount), 0) FROM contra WHERE company_id = ? AND bank_id = ? AND status = 'active' AND entry_type = 'Dr')
      AS total_out`,
    [company_id, bank_id, company_id, bank_id, company_id, bank_id, company_id, bank_id, company_id, bank_id]
  );

  const totalIn = Number(inResult.total_in || 0);
  const totalOut = Number(outResult.total_out || 0);
  
  return openingBalance + totalIn - totalOut;
};
