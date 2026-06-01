const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();
const mysql = require("mysql2/promise");
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// DB check function
const checkDbConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log(
      `✅ MySQL connectedd → ${process.env.DB_HOST}:${process.env.DB_PORT}`,
    );
    connection.release();
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    process.exit(1);
  }
};

// export db for controllers
module.exports = db;
// ===== EXPRESS APP =====
const app = express();
// app.use(cors());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://accounts.kingfishlogistics.in",
      "https://accountsmanage.kingfishlogistics.in"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH","OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
// ✅ STATIC UPLOADS FOLDER
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== ROUTES =====
const companyRoutes = require("./routes/company.routes");
const partyRoutes = require("./routes/party.routes");
const groupRoutes = require("./routes/group.routes");
const ledgerRoutes = require("./routes/ledger.routes");
const voucherRoutes = require("./routes/voucher.routes");
const reportRoutes = require("./routes/report.routes");
const taxRoutes = require("./routes/tax.routes");
const unitRoutes = require("./routes/unit.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const purchaseTdsRoutes = require("./routes/purchaseTdsRoutes");
const saleRoutes = require("./routes/sale.routes");
const masterRoutes = require("./routes/master.router");
const bankRoutes = require("./routes/bank.routes");
const itemsRoutes = require("./routes/items.routes");
const departmentRoutes = require("./routes/department.routes");
const designationRoutes = require("./routes/designation.routes");
const employeeRoutes = require("./routes/employee.routes");
const expensemasterRoutes = require("./routes/expenseMaster.routes");
const expensetypeRoutes = require("./routes/expenseType.routes");
const expenseRoutes = require("./routes/expense.routes");
const financialYearRoutes = require("./routes/financialYear.routes");
const journalRoutes = require("./routes/journal.routes");
const gstrRoutes = require("./routes/gstr.routes");
const creditNoteRoutes = require("./routes/creditNote.routes");
const debitNoteRoutes = require("./routes/debitNote.routes");
const prefixRoutes = require("./routes/prefix.routes");
const openingBalanceRoutes = require("./routes/openingBalance.routes");
const contraRoutes = require("./routes/contra.routes");
const cashreportRoutes = require("./routes/cashreport.routes");
const bankreportRoutes = require("./routes/bankreport.routes");
const saleReportRoutes = require("./routes/saleReport.Routes");
const purchaseReportRoutes = require("./routes/purchaseReport.Routes");
const tdsReportRoutes = require("./routes/tdsReport.routes");
const taxDutiesRoutes = require("./routes/taxDuty.routes");
const shiftMasterRoutes = require("./routes/shift.routes");
const salarygenRoutes = require("./routes/salary_generate.routes");
const salarypayRoutes = require("./routes/salary_pay.routes");
const gstMasterRoutes = require("./routes/gstMaster.routes");
const dashboardRoutes  = require("./routes/dashboard.routes");


app.use("/api/company", companyRoutes);
app.use("/api/group", groupRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/voucher", voucherRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/party", partyRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/unit", unitRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/purchase-tds", purchaseTdsRoutes);
app.use("/api/sale", saleRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/expense-master", expensemasterRoutes);
app.use("/api/gst-master", gstMasterRoutes);
app.use("/api/expense-type", expensetypeRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/financial-year", financialYearRoutes);
app.use("/api/journal-voucher", journalRoutes);
app.use("/api/gstr-report", gstrRoutes);
app.use("/api/credit-note", creditNoteRoutes);
app.use("/api/debit-note", debitNoteRoutes);
app.use("/api/prefix", prefixRoutes);
app.use("/api/opening-balance", openingBalanceRoutes);
app.use("/api/contra", contraRoutes);
app.use("/api/cash-report", cashreportRoutes);
app.use("/api/bank-report", bankreportRoutes);
app.use("/api/reports", saleReportRoutes);
app.use("/api/reports", purchaseReportRoutes);
app.use("/api/reports", tdsReportRoutes);
app.use("/api/tax-duties", taxDutiesRoutes);
app.use("/api/shift", shiftMasterRoutes);
app.use("/api/salarygenerate", salarygenRoutes);
app.use("/api/salarypay", salarypayRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ===== START SERVER =====
const PORT = process.env.PORT || 8000;

(async () => {
  await checkDbConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();