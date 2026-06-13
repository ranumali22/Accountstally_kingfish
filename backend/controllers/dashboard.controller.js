const db = require("../config/db");

exports.getDashboardData = async (req, res) => {
  try {
    const company_id = req.company_id;

    // 1. Get Financial Year
    const [[company]] = await db.query(
      `SELECT financial_year_start, financial_year_end 
       FROM companies WHERE id = ?`,
      [company_id]
    );

    const startDate = company?.financial_year_start;
    const endDate = company?.financial_year_end;

    const dateFilterSale = startDate && endDate ? `AND voucher_date BETWEEN ? AND ?` : ``;
    const dateFilterExp = startDate && endDate ? `AND expense_date BETWEEN ? AND ?` : ``;
    const dateParams = startDate && endDate ? [startDate, endDate] : [];

    // 2. Run all queries in PARALLEL for maximum speed
    const [
      [salesResult],
      [purchaseResult],
      [expensesResult],
      [receivableResult],
      [purchaseDueResult],
      [expenseDueResult],
      [netProfitResult]
    ] = await Promise.all([
      // 🔹 TOTAL SALES (Current FY)
      db.query(
        `SELECT SUM(total_amount) AS total 
         FROM sale_bill 
         WHERE company_id=? AND status='active' ${dateFilterSale}`,
        [company_id, ...dateParams]
      ),
      // 🔹 TOTAL PURCHASE (Current FY)
      db.query(
        `SELECT SUM(total_amount) AS total 
         FROM purchase_bill 
         WHERE company_id=? AND status='active' ${dateFilterSale}`,
        [company_id, ...dateParams]
      ),
      // 🔹 TOTAL EXPENSE (Current FY)
      db.query(
        `SELECT SUM(amount) AS total 
         FROM expenses 
         WHERE company_id=? AND is_deleted=0 ${dateFilterExp}`,
        [company_id, ...dateParams]
      ),
      // 🔹 RECEIVABLE (All time unpaid)
      db.query(
        `SELECT SUM(due_amount) AS total 
         FROM sale_bill 
         WHERE company_id=? AND status='active'`,
        [company_id]
      ),
      // 🔹 PAYABLE PURCHASE (All time unpaid)
      db.query(
        `SELECT SUM(due_amount) AS total 
         FROM purchase_bill 
         WHERE company_id=? AND status='active'`,
        [company_id]
      ),
      // 🔹 PAYABLE EXPENSE (All time unpaid)
      db.query(
        `SELECT SUM(due) AS total 
         FROM expenses 
         WHERE company_id=? AND is_deleted=0`,
        [company_id]
      ),
      // 🔹 ACCURATE NET PROFIT (Current FY)
      // Uses the same logic as Profit & Loss Report
      db.query(
        `SELECT
          SUM(
            CASE WHEN g.nature='INCOME'
            THEN IFNULL(e.credit,0)-IFNULL(e.debit,0)
            ELSE 0 END
          ) - SUM(
            CASE WHEN g.nature='EXPENSE'
            THEN IFNULL(e.debit,0)-IFNULL(e.credit,0)
            ELSE 0 END
          ) AS net_profit
         FROM ledgers l
         JOIN groups_master g ON g.id=l.group_id
         LEFT JOIN ledger_entries e
           ON e.ledger_id=l.id
           AND e.company_id=l.company_id
           ${startDate && endDate ? "AND e.entry_date BETWEEN ? AND ?" : ""}
         WHERE l.company_id=?`,
        [...(startDate && endDate ? [startDate, endDate] : []), company_id]
      )
    ]);

    // Extract numbers safely
    const totalSales = Number(salesResult[0]?.total || 0);
    const totalPurchase = Number(purchaseResult[0]?.total || 0);
    const totalExpense = Number(expensesResult[0]?.total || 0);
    const totalReceivable = Number(receivableResult[0]?.total || 0);
    
    const totalPayable =
      (Number(purchaseDueResult[0]?.total || 0)) +
      (Number(expenseDueResult[0]?.total || 0));

    const netProfit = Number(netProfitResult[0]?.net_profit || 0);

    res.json({
      totalRevenue: totalSales,
      totalPurchase: totalPurchase,
      totalExpense: totalExpense,
      netProfit: netProfit,
      receivable: totalReceivable,
      payable: totalPayable,
      financialYear: startDate && endDate ? { start: startDate, end: endDate } : null
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Dashboard error", error: err.message });
  }
};