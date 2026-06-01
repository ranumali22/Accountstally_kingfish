import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CompanyManagement from "../components/form/CompanyManagment";
import AppLayout from "../layout/companyLayout/AppLayout";
import AdminLayout from "../layout/adminLayout/AdminLayout";
import SaleReport from "../pages/companypannel/Sale/SaleReport.jsx";
import PurchaseReport from "../pages/companypannel/PurchaseForm/purchaseReport.jsx";
import ExpenseReport from "../pages/companypannel/Expense/ExpenseReport.jsx";
import Calendar from "../pages/Calendar";
import CountryMaster from "../pages/Masters/CountryMaster";
import StateMaster from "../pages/Masters/StateMaster";
import CityMaster from "../pages/Masters/CityMaster";
import PincodeMaster from "../pages/Masters/Pincode";
import KycCompanyForm from "../pages/PratyAdd/PartyTable";
import AdminDashboard from "../pages/adminpannel/Dashboard";
import AdminCompanies from "../pages/adminpannel/Companies";
import CompanyLogin from "../pages/auth/CompanyLogin";
import AdminLogin from "../pages/auth/AdminLogin";
import AuthGuard from "./AuthGuard";
import UserProfiles from "../pages/companypannel/Profile";
import PaymentReceiptForm from "../pages/companypannel/Vouchers/Payment-ReceiptFrom";
import VoucherList from "../pages/companypannel/Vouchers/Payment-ReceiptTable.jsx";
import ConsoleBillPage from "../pages/companypannel/consolepAGE.JSX";
import Groups from "../pages/companypannel/Group/group";
import Ledgers from "../pages/companypannel/Ledger/ledger";
import TrialBalance from "../pages/companypannel/Reports/TrialBalance";
import ProfitLoss from "../pages/companypannel/Reports/ProfitLoss";
import BalanceSheet from "../pages/companypannel/Reports/BalanceSheet";
import DailyBook from "../pages/companypannel/Reports/DayBook";
import Tax from "../pages/companypannel/tax/tax";
import Unit from "../pages/companypannel/unit/unit";
import Expense from "../pages/ExpenseMaster/ExpenseMaster.jsx";
import ExpenseSubmaster from "../pages/ExpenseMaster/ExpenseSubmaster.jsx";
// ✅ Sales
import Sale from "../pages/companypannel/Sale/Sale";
import SaleForm from "../pages/companypannel/Sale/SaleForm";
import BulkSale from "../pages/companypannel/Sale/BulkSale";
import Purchage from "../pages/companypannel/PurchaseForm/PurchageBill";
import PurchageForm from "../pages/companypannel/PurchaseForm/PurchageForm";

//bank
import BankMaster from "../pages/BankMaster/BankTable.jsx";
import BankForm from "../pages/BankMaster/BankForm";
import ExpenseEntryForm from "../pages/companypannel/Expense/ExpenseEntryForm.jsx";
import ExpensePage from "../pages/companypannel/Expense/Expensetable.jsx";
import CNoteForm from "../pages/companypannel/CreditNote/CreditNoteForm.jsx";
import CreditNoteList from "../pages/companypannel/CreditNote/CreditNoteList.jsx";
import DNoteForm from "../pages/companypannel/DebitNote/DebitNoteForm.jsx";
import DebitNoteList from "../pages/companypannel/DebitNote/DebitNoteList.jsx";
import EmployeeSalaryForm from "../pages/companypannel/EmplAdd/AddFrom.jsx";
import EmployeeReportTable from "../pages/companypannel/EmplAdd/EmpTable.jsx";
import EmployeeSalaryView from "../pages/companypannel/EmplAdd/EmployeedetailView.jsx";
import DepartmentAdd from "../pages/DepartmentMaster/Department.jsx";
import DesignationList from "../pages/DesignationMaster/Designation.jsx";
import ItemsMaster from "../pages/companypannel/items/ItemsMaster.jsx";
import PrefixMaster from "../pages/PrefixMaster/prefix.jsx";
import FinancialYearMaster from "../pages/FinancialYearmaster/FinancialYearMaster.jsx";
import JurnalVoucherReport from "../pages/companypannel/Vouchers/Journal/journalTable.jsx";
import ThirdPartyVoucherForm from "../pages/companypannel/Vouchers/ThirdPartyVoucherForm.jsx";
import Dashboard from "../pages/companypannel/Dashboard/dashboard.jsx";
import GSTR1 from "../pages/companypannel/Reports/GSTR1.jsx";
import GSTR2B from "../pages/companypannel/Reports/GSTR2B.jsx";
import GSTR3B from "../pages/companypannel/Reports/GSTR3B.jsx";
import GSTR9 from "../pages/companypannel/Reports/GSTR9.jsx";

import TdsForm from "../pages/companypannel/TDS/TdsForm.jsx";
import TdsList from "../pages/companypannel/TDS/TdsList.jsx";
import TdsReport from "../pages/companypannel/TDS/tdsReport.jsx";

import OpeningBalanceList from "../pages/companypannel/openingBalance/openingBalanceList.jsx";
import CashReport from "../pages/companypannel/CashReport/Cashreport.jsx";
import BankReport from "../pages/companypannel/BankReport/Bankreport.jsx";
import ContraList from "../pages/companypannel/contra/ContraList.jsx";
import VoucherReport from "../pages/companypannel/Vouchers/VoucherReport.jsx";
import DebitNoteReport from "../pages/companypannel/DebitNote/debitNoteReport.jsx";
import CreditNoteReport from "../pages/companypannel/CreditNote/creditNoteReport.jsx";
import ContraReport from "../pages/companypannel/contra/contraReport.jsx";
import GstMasterList from "../pages/companypannel/gstMaster/gstMasterList.jsx";
import GstMasterForm from "../pages/companypannel/gstMaster/gstMasterForm.jsx";
import PayrollForm from "../pages/companypannel/EmplAdd/Payrollgenerate.jsx";
import PayrolePay from "../pages/companypannel/EmplAdd/payrolepay.jsx";
import PayroletList from "../pages/companypannel/EmplAdd/payroleList.jsx";
import ShiftMaster from "../pages/companypannel/EmplAdd/shiftmaster.jsx";

function Home() {
  return <Dashboard />;
}
export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<CompanyLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          element={
            <AuthGuard role={"company"}>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Home />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="profile" element={<UserProfiles />} />

          <Route path="partyadd" element={<KycCompanyForm />} />
          <Route path="masterscountry" element={<CountryMaster />} />
          <Route path="city" element={<CityMaster />} />
          <Route path="state" element={<StateMaster />} />
          <Route path="pincode" element={<PincodeMaster />} />

          <Route path="voucher/payment" element={<PaymentReceiptForm />} />
          <Route path="voucher/list" element={<VoucherList />} />
          <Route path="voucher/journal" element={<JurnalVoucherReport />} />
          <Route path="voucher/third-party-transfer" element={<ThirdPartyVoucherForm />} />
          <Route path="voucher/contra" element={<ContraList />} />

          <Route path="/report/contra" element={<ContraReport />} />

          <Route path="/report/voucher" element={<VoucherReport />} />
          <Route path="Group" element={<Groups />} />
          <Route path="ledger" element={<Ledgers />} />

          <Route path="tax-master" element={<Tax />} />
          <Route path="unit-master" element={<Unit />} />
          <Route path="Expense-master" element={<Expense />} />
          <Route path="Expense-type" element={<ExpenseSubmaster />} />
          <Route path="Department-master" element={<DepartmentAdd />} />
          <Route path="Designation-master" element={<DesignationList />} />
          <Route path="shift" element={<ShiftMaster />} />

          <Route path="TrialBalance" element={<TrialBalance />} />
          <Route path="ProfitLoss" element={<ProfitLoss />} />
          <Route path="BalanceSheet" element={<BalanceSheet />} />
          <Route path="DayBook" element={<DailyBook />} />
          <Route path="Bank-table" element={<BankMaster />} />
          <Route path="Bank-form" element={<BankForm />} />
          <Route path="income/sales" element={<Sale />} />
          <Route path="income/bulk-sales" element={<BulkSale />} />
          <Route path="income/sales/create" element={<SaleForm />} />
          <Route path="item-master" element={<ItemsMaster />} />
          <Route path="expense/purchase" element={<Purchage />} />
          <Route path="expense/purchase/create" element={<PurchageForm />} />

          <Route path="billing/console-bill" element={<ConsoleBillPage />} />
          <Route path="ExpenseEntry" element={<ExpenseEntryForm />} />
          <Route path="ExpensePage" element={<ExpensePage />} />
          <Route path="voucher/CNoteForm" element={<CNoteForm />} />
          <Route path="voucher/CNNoteList" element={<CreditNoteList />} />
          <Route path="report/credit-note" element={<CreditNoteReport />} />
          <Route path="report/debit-note" element={<DebitNoteReport />} />
          <Route path="/TdsForm" element={<TdsForm />} />
          <Route path="/TdsList" element={<TdsList />} />
          <Route path="/report/tds" element={<TdsReport />} />

          <Route path="voucher/DNoteForm" element={<DNoteForm />} />
          <Route path="voucher/DNNoteList" element={<DebitNoteList />} />

          <Route path="EmployeeForm" element={<EmployeeSalaryForm />} />
          <Route path="EmployeeReportTable" element={<EmployeeReportTable />} />
          <Route path="EmployeeSalaryView" element={<EmployeeSalaryView />} />
          <Route path="payrole-generate" element={<PayrollForm />} />
          <Route path="payrole-list" element={<PayroletList />} />
          <Route path="payrole-pay" element={<PayrolePay />} />
          <Route path="prefix" element={<PrefixMaster />} />
          <Route path="FinancialYear" element={<FinancialYearMaster />} />
          <Route path="openingBalance" element={<OpeningBalanceList />} />
          <Route path="cashbook" element={<CashReport />} />
          <Route path="bankbook" element={<BankReport />} />

          <Route path="report/sale" element={<SaleReport />} />
          <Route path="report/purchase" element={<PurchaseReport />} />
          <Route path="report/expense" element={<ExpenseReport />} />

          <Route path="report/gstr1" element={<GSTR1 />} />
          <Route path="report/gstr2b" element={<GSTR2B />} />
          <Route path="report/gstr3b" element={<GSTR3B />} />
          <Route path="report/gstr9" element={<GSTR9 />} />

          <Route path="gst-master" element={<GstMasterList />} />
          <Route path="gst-masterform" element={<GstMasterForm />} />
          <Route path="gst-masterform/:id" element={<GstMasterForm />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AuthGuard role={"admin"}>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="company-profile" element={<CompanyManagement />} />
          <Route path="companies" element={<AdminCompanies />} />
        </Route>
      </Routes>
    </Router>
  );
}
