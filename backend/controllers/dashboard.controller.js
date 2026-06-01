const db = require("../config/db");

exports.getDashboardData = async (req, res) => {
  try {
    const company_id = req.company_id;

    // 🔹 TOTAL SALES
    const [[sales]] = await db.query(
      `SELECT SUM(total_amount) AS total 
       FROM sale_bill 
       WHERE company_id=? AND status='active'`,
      [company_id]
    );

    // 🔹 TOTAL PURCHASE (FULL)
    const [[purchase]] = await db.query(
      `SELECT SUM(total_amount) AS total 
       FROM purchase_bill 
       WHERE company_id=? AND status='active'`,
      [company_id]
    );

    // 🔹 TOTAL EXPENSE (FULL)
    const [[expenses]] = await db.query(
      `SELECT SUM(amount) AS total 
       FROM expenses 
       WHERE company_id=? AND is_deleted=0`,
      [company_id]
    );

    // 🔹 RECEIVABLE (DUE)
    const [[receivable]] = await db.query(
      `SELECT SUM(due_amount) AS total 
       FROM sale_bill 
       WHERE company_id=? AND status='active'`,
      [company_id]
    );

    // 🔹 PAYABLE (DUE)
    const [[purchaseDue]] = await db.query(
      `SELECT SUM(due_amount) AS total 
       FROM purchase_bill 
       WHERE company_id=? AND status='active'`,
      [company_id]
    );

    const [[expenseDue]] = await db.query(
      `SELECT SUM(due) AS total 
       FROM expenses 
       WHERE company_id=? AND is_deleted=0`,
      [company_id]
    );

    // 🔥 NUMBER FIX
    const totalSales = Number(sales.total) || 0;
    const totalPurchase = Number(purchase.total) || 0;
    const totalExpense = Number(expenses.total) || 0;
    const totalReceivable = Number(receivable.total) || 0;

    const totalPayable =
      (Number(purchaseDue.total) || 0) +
      (Number(expenseDue.total) || 0);
      const netProfit = totalSales - totalPurchase - totalExpense;

    res.json({
      totalRevenue: totalSales,
      totalPurchase: totalPurchase,
      totalExpense: totalExpense,
      netProfit: netProfit,
      receivable: totalReceivable,
      payable: totalPayable,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard error" });
  }
};