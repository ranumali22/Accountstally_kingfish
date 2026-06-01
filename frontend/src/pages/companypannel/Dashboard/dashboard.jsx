import { } from "react";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  CreditCard,
  PlusCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  getSales,
  getPurchasesByCompany,
  getExpenses,
  getVouchersByCompany,
  getDashboardData,
} from "../../../api";

import { formatDate } from "../../../utils/dateUtils";

import { useNavigate } from "react-router-dom";

/* ================= TABLE ================= */

function RecentTable({ title, data, columns, renderRow, viewAll }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button
          onClick={() => navigate(viewAll)}
          className="text-xs text-blue-600 hover:underline"
        >
          View All →
        </button>
      </div>

      <table className="w-full text-sm border border-gray-300">
        <thead>
          <tr className="bg-gray-200 text-gray-800">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`border border-gray-300 px-3 py-2 font-semibold ${col === "Amount" ? "text-right" : "text-left"
                  }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="border border-gray-500 text-center py-4 text-gray-400"
              >
                No data
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-blue-50 border border-gray-300`}
              >
                {React.Children.map(renderRow(row), (cell) =>
                  React.cloneElement(cell, {
                    className:
                      "border border-gray-500 px-3 py-2 " +
                      (cell.props.className || ""),
                  })
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Date formatting is handled by the imported formatDate utility

/* ================= MAIN ================= */

export default function Dashboard() {
  const companyData = JSON.parse(localStorage.getItem("company_data"));
  const company_id = companyData?.id;

  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [dashboard, setDashboard] = useState({});

  useEffect(() => {
    loadAllData();
  }, []);

  /* ================= FAST LOAD ================= */

  const loadAllData = async () => {
    try {
      const companyData = JSON.parse(localStorage.getItem("company_data"));
      const company_id = companyData?.id;

      // ✅ CACHE (instant UI)
      const cachedDash = localStorage.getItem("dashboard_cache");
      if (cachedDash) {
        setDashboard(JSON.parse(cachedDash));
      }

      // ✅ NON-BLOCKING CALLS
      getDashboardData().then((res) => {
        setDashboard(res.data);
        localStorage.setItem("dashboard_cache", JSON.stringify(res.data));
      });

      // ✅ SALES (res.data?.data)
      getSales().then((res) => {
        const data = res.data?.data || [];
        setSales([...data].sort((a, b) => b.id - a.id).slice(0, 5));
      });

      // ✅ PURCHASES (res.data?.data)
      getPurchasesByCompany().then((res) => {
        const data = res.data?.data || [];
        setPurchases([...data].sort((a, b) => b.id - a.id).slice(0, 5));
      });

      // ✅ EXPENSES (res.data)
      getExpenses().then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setExpenses([...data].sort((a, b) => b.id - a.id).slice(0, 5));
      });

      // ✅ VOUCHERS (res.data)
      getVouchersByCompany().then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setVouchers([...data].sort((a, b) => b.id - a.id).slice(0, 5));
      });

    } catch (err) {
      console.log(err);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-bold">Accounting Dashboard</h2>
          <p className="text-gray-500">
            Financial overview & business performance
          </p>
        </div>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Sale"
            value={`₹ ${dashboard.totalRevenue || 0}`}
            icon={IndianRupee}
            color="text-green-600 bg-green-100"
          />

          <StatCard
            title="Total Purchase"
            value={`₹ ${dashboard.totalPurchase || 0}`}
            icon={Users}
            color="text-purple-600 bg-purple-100"
          />

          <StatCard
            title="Total Expenses"
            value={`₹ ${Number(dashboard.totalExpense || 0).toLocaleString(
              "en-IN",
              { minimumFractionDigits: 2 }
            )}`}
            icon={TrendingDown}
            color="text-red-600 bg-red-100"
          />

          <StatCard
            title="Net Profit"
            value={`₹ ${Number(dashboard.netProfit || 0).toFixed(2)}`}
            icon={TrendingUp}
            color="text-blue-600 bg-blue-100"
          />
        </div>

        {/* OUTSTANDING */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Outstanding Receivable" value={dashboard.receivable} color="green" />
          <Card title="Outstanding Payable" value={dashboard.payable} color="red" />
        </div>

        {/* ACTIONS */}
        <div className="bg-white shadow rounded-xl p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ActionButton icon={PlusCircle} label="Sale" onClick={() => navigate("/income/sales")} />
            <ActionButton icon={FileText} label="Purchase" onClick={() => navigate("/expense/purchase")} />
            <ActionButton icon={CreditCard} label="Expense" onClick={() => navigate("/ExpensePage")} />
            <ActionButton icon={Users} label="Voucher" onClick={() => navigate("/voucher/list")} />
          </div>
        </div>

        {/* TABLES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecentTable title="Recent Sale" data={sales} columns={["Bill No", "Date", "Party", "Amount"]} renderRow={(row) => (
            <>
              <td className="p-4 font-semibold text-blue-600">{row.invoice_no || "-"}</td>
              <td className="p-4">{formatDate(row.voucher_date)}</td>
              <td className="p-4">{row.party}</td>
              <td className="text-right font-semibold text-green-600 p-4">₹ {row.total_amount}</td>
            </>
          )} viewAll="/income/sales" />

          <RecentTable title="Recent Purchase" data={purchases} columns={["Bill No", "Date", "Party", "Amount"]} renderRow={(row) => (
            <>
              <td className="p-4 font-semibold text-blue-600">{row.supplier_invoice_no || row.invoice_no || "-"}</td>
              <td className="p-4">{formatDate(row.voucher_date)}</td>
              <td className="p-4">{row.party}</td>
              <td className="text-right font-semibold text-green-600 p-4">₹ {row.total_amount}</td>
            </>
          )} viewAll="/expense/purchase" />

          <RecentTable title="Recent Expense" data={expenses} columns={["Vch No", "Date", "Party", "Amount"]} renderRow={(row) => (
            <>
              <td className="p-4 font-semibold text-blue-600">{row.voucher_number || "-"}</td>
              <td className="p-4">{formatDate(row.expense_date)}</td>
              <td className="p-4">{row.party_name}</td>
              <td className="text-right font-semibold text-green-600 p-4">₹ {row.amount}</td>
            </>
          )} viewAll="/ExpensePage" />

          <RecentTable title="Recent Voucher" data={vouchers} columns={["Vch No", "Date", "Type", "Party", "Amount"]} renderRow={(row) => (
            <>
              <td className="p-4 font-semibold text-blue-600">{row.voucher_no || "-"}</td>
              <td className="p-4">{formatDate(row.voucher_date)}</td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${row.voucher_type === 'RECEIPT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {row.voucher_type}
                </span>
              </td>
              <td className="p-4">{row.party_name}</td>
              <td className="text-right font-semibold text-blue-600 p-4">₹ {row.payment_amount}</td>
            </>
          )} viewAll="/voucher/list" />
        </div>

      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white shadow rounded-xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="bg-white shadow rounded-xl p-5">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className={`text-3xl font-bold text-${color}-600`}>
        ₹ {value || 0}
      </p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center border rounded-xl p-4 hover:bg-gray-50 transition w-full"
    >
      <Icon className="mb-2" size={22} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}