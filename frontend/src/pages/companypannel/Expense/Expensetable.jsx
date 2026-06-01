import { useState, useMemo, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Eye,
  Pencil,
  Printer,
  Trash2,
  Search,
  X,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExpenseEntryForm from "./ExpenseEntryForm";

import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext";

import { getExpenses, deleteExpense, getExpenseById } from "../../../api";
import { showError } from "../../../components/ui/alert/Alert";
import { formatDate, toYYYYMMDD } from "../../../utils/dateUtils";
export default function UnifiedReportPage({ title = "Expense" }) {
  const navigate = useNavigate();

  // toLocalYYYYMMDD is now handled by the central utility
  const today = new Date();

  const firstDay = toYYYYMMDD(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const lastDay = toYYYYMMDD(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );
  // const { loading, setLoading } = useContext(LoaderContext);
  const [loading, setLocalLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [fromDate, setFromDate] = useState(new Date(firstDay));
  const [toDate, setToDate] = useState(new Date(lastDay));
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [mode, setMode] = useState("list");
  const [viewRow, setViewRow] = useState(null);

  // list | add | edit | view
  // formatDate is now imported from central dateUtils.js

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLocalLoading(true);

      const res = await getExpenses();

      const list = Array.isArray(res.data) ? res.data : [];

      const mapped = list
        .filter((e) => Number(e.status) === 1)
        .map((e) => ({
          id: e.id,
          voucher_number: e.voucher_number,
          bill_number: e.bill_number,
          expense_group_id: e.expense_group_id,
          expense_group_name: e.expense_group_name || "-",
          expense_type: e.expense_type,
          expense_head: e.expense_master,
          party_id: e.party_id,
          party_name: e.party_name || "-",
          party_gst: e.party_gst || "-",
          party_phone: e.party_phone || "-",
          party_address: e.party_address || "-",
          city: e.city || "-",
          state: e.state || "-",
          pincode: e.pincode || "-",
          amount: Number(e.amount || 0),
          paid: Number(e.paid || 0),
          due: Number(e.due || 0),
          date: e.expense_date,
          narration: e.narration,
          document: e.document, // 🔥 Bill Path
        }));

      setRows(mapped);
    } catch (err) {
      console.error("Expense fetch failed", err);
      setRows([]);
    } finally {
      setLocalLoading(false);
    }
  };

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const d = new Date(r.date);

      if (fromDate && d < fromDate) return false;
      // if (toDate && d > toDate) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }

      if (search) {
        const s = search.toLowerCase();
        return (
          r.party_name?.toLowerCase().includes(s) ||
          r.expense_type?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, fromDate, toDate, search]);

  /* ================= SUMMARY ================= */

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, row) => {
        acc.total += row.amount;
        acc.paid += row.paid;
        acc.unpaid += row.due;
        return acc;
      },
      { total: 0, paid: 0, unpaid: 0 },
    );
  }, [filtered]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ================= ACTIONS ================= */

  // const handleDelete = async (row) => {
  //   if (!window.confirm("Delete this expense?")) return;

  //   try {
  //     setLoading(true);

  //     await deleteExpense(row.id);
  //     setPage(1);

  //     await fetchExpenses(false); // 👈 pass flag
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleDelete = async (row) => {
    if (!window.confirm("Delete this expense?")) return;

    try {
      setLocalLoading(true);

      await deleteExpense(row.id);

      // instant UI update
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  /* ================= PRINT LOGIC (ROBUST) ================= */

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve("");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve("");
      img.src = url;
    });
  };

  const handlePrint = async (row) => {
    const company = JSON.parse(localStorage.getItem("company_data") || "{}");
    
    // Construct full logo URL
    let fullLogoUrl = "";
    if (company.logo) {
      fullLogoUrl = company.logo.startsWith("http")
        ? company.logo
        : `${import.meta.env.VITE_SERVER_URL}/${company.logo}`;
    }

    // Load logo as base64 to ensure it prints
    const base64Logo = await loadImageAsBase64(fullLogoUrl);

    const w = window.open("", "_blank");

    w.document.write(`
  <html>
    <head>
      <title>Expense Voucher - ${row.voucher_number || row.id}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --primary: #1e40af;
          --primary-light: #eff6ff;
          --border: #e5e7eb;
          --text-dark: #111827;
          --text-muted: #4b5563;
        }

        body {
          font-family: 'Inter', sans-serif;
          color: var(--text-dark);
          background: #fff;
          padding: 40px;
          line-height: 1.5;
        }

        .voucher-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid var(--border);
          padding: 40px;
          background: #fff;
          min-height: 1000px;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid var(--primary);
          padding-bottom: 25px;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .logo-img {
          max-width: 100px;
          max-height: 100px;
          object-fit: contain;
        }

        .company-info h1 {
          font-size: 22px;
          font-weight: 800;
          color: var(--primary);
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .company-details {
          font-size: 11px;
          color: var(--text-muted);
        }

        .voucher-title-box { text-align: right; }
        .voucher-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-dark);
          margin-bottom: 5px;
        }

        .voucher-meta { font-size: 12px; color: var(--text-muted); }
        .meta-item { display: flex; justify-content: flex-end; gap: 8px; }
        .meta-label { font-weight: 600; color: var(--text-dark); }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }

        .info-block h3 {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--primary);
          margin-bottom: 12px;
          border-bottom: 2px solid var(--primary-light);
          padding-bottom: 4px;
          font-weight: 700;
        }

        .info-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
        .info-sub { color: var(--text-muted); font-size: 13px; }

        .table-container { flex-grow: 1; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th {
          background: var(--primary-light);
          color: var(--primary);
          font-size: 11px;
          padding: 12px 15px;
          text-align: left;
          border-bottom: 2px solid var(--primary);
        }
        td { padding: 15px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
        .text-right { text-align: right; }

        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
        .grand-total {
          background: var(--primary);
          color: #fff;
          padding: 12px 15px;
          border-radius: 6px;
          width: 260px;
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 700;
        }

        .narration-box {
          background: #f9fafb;
          padding: 15px;
          border-left: 4px solid var(--primary);
          border-radius: 4px;
          margin-bottom: 60px;
        }

        .footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          margin-top: auto;
        }
        .sig-box { text-align: center; }
        .sig-line { border-top: 2px solid var(--primary-light); margin-bottom: 10px; }
        .sig-label { font-size: 11px; font-weight: 700; color: var(--text-muted); }

        @media print {
          body { padding: 0; }
          .voucher-container { border: none; max-width: 100%; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="voucher-container">
        <header class="header">
          <div class="brand-section">
            ${base64Logo ? `<img src="${base64Logo}" class="logo-img" />` : ""}
            <div class="company-info">
              <h1>${company.name || "Company Name"}</h1>
              <div class="company-details">
                <p>${company.address || ""}</p>
                <p>${company.city || ""}, ${company.state || ""} - ${company.pincode || ""}</p>
                ${company.gst_number ? `<p style="margin-top:2px;"><b>GSTIN:</b> ${company.gst_number}</p>` : ""}
              </div>
            </div>
          </div>

          <div class="voucher-title-box">
            <h2 class="voucher-title">EXPENSE VOUCHER</h2>
            <div class="voucher-meta">
              <div class="meta-item"><span class="meta-label">No:</span> #${row.voucher_number || row.id}</div>
              <div class="meta-item"><span class="meta-label">Date:</span> ${new Date(row.date).toLocaleDateString("en-GB")}</div>
            </div>
          </div>
        </header>

        <div class="details-grid">
          <div class="info-block">
            <h3>Payee Details</h3>
            <div class="info-name">${row.party_name}</div>
            <div class="info-sub">
              ${row.party_address !== "-" ? `<p>${row.party_address}</p>` : ""}
              ${row.party_gst !== "-" ? `<p>GSTIN: ${row.party_gst}</p>` : ""}
              ${row.party_phone !== "-" ? `<p>Contact: ${row.party_phone}</p>` : ""}
            </div>
          </div>
          <div class="info-block">
            <h3>Expense Details</h3>
            <div class="info-name">${row.expense_head}</div>
            <div class="info-sub">
              <p>Category: ${row.expense_type}</p>
              <p>Group: ${row.expense_group_name || "-"}</p>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr><th>Description</th><th class="text-right">Amount (₹)</th></tr>
            </thead>
            <tbody>
              <tr><td>Total Expense Amount</td><td class="text-right"><b>${row.amount.toFixed(2)}</b></td></tr>
              <tr><td style="color: #059669;">Less: Amount Paid</td><td class="text-right" style="color: #059669;">- ${row.paid.toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="totals-section">
          <div class="grand-total"><span>NET DUE</span><span>₹ ${row.due.toFixed(2)}</span></div>
        </div>

        ${row.narration && row.narration !== "-" ? `<div class="narration-box"><p style="font-size:10px; font-weight:700; color:var(--primary);">REMARKS</p><p style="font-style:italic; font-size:13px;">${row.narration}</p></div>` : ""}

        <footer class="footer">
          <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Receiver's Signature</div></div>
          <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Authorized Signatory</div></div>
        </footer>
      </div>
      <script>
        window.onload = () => { setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 500); };
      </script>
    </body>
  </html>
  `);

    w.document.close();
  };

  const handleDateSearch = () => {
    if (!fromDate || !toDate) {
      showError("Please select both dates!");
      return;
    }

    if (fromDate > toDate) {
      showError("From Date should be smaller than To Date");
      return;
    }

    // loadSales();
    fetchExpenses();
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {!showForm && (
        <div className="bg-white border rounded-xl shadow-sm p-5 mb-4">
          {/* Summary Cards */}
          <div className="flex flex-wrap items-center gap-3">
            <Card title="Paid" value={summary.paid} color="green" />

            <div className="text-lg font-semibold text-gray-400">+</div>

            <Card title="Unpaid" value={summary.unpaid} color="blue" />

            <div className="text-lg font-semibold text-gray-400">=</div>

            <Card title="Total" value={summary.total} color="yellow" />
          </div>

          {/* Filters */}
          <div className="mt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <span className="text-sm px-3 py-2 bg-gray-100 rounded-md text-gray-600">
                Between
              </span>

              {/* Date Pickers */}
              <div className="flex flex-wrap items-center gap-3">
                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="dd-mm-yyyy"
                  className="h-10 border rounded-md px-3 text-sm w-[160px] focus:ring-2 focus:ring-[#22A586] outline-none"
                />

                <span className="text-sm text-gray-500">To</span>

                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="dd-mm-yyyy"
                  className="h-10 border rounded-md px-3 text-sm w-[160px] focus:ring-2 focus:ring-[#22A586] outline-none"
                />
              </div>

              {/* Search Button */}
              <button
                type="button"
                onClick={handleDateSearch}
                className="h-10 px-6 rounded-md bg-[#22A586] text-white font-medium hover:bg-[#1c8f75] transition-all w-full sm:w-auto"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ExpenseEntryForm
          editData={editingRow}
          mode={mode}
          onClose={() => {
            setShowForm(false);
            setEditingRow(null);
            setMode("list");
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingRow(null);
            setMode("list");
            fetchExpenses();
          }}
        />
      )}

      {/* TABLE */}
      {!showForm && (
        <div className="bg-white border rounded-xl shadow-sm">
          <div className="flex justify-between items-center px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">
              All {title} ({filtered.length})
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-[36px] w-[240px] border rounded-md pl-10 pr-3 text-sm"
                />
                <Search
                  size={16}
                  className="absolute left-3 top-[10px] text-gray-500"
                />
              </div>

              <button
                onClick={() => {
                  setEditingRow(null);
                  setMode("add");
                  setShowForm(true);
                }}
                className="h-[36px] px-3 bg-green-600 text-white rounded-md text-sm"
              >
                + New Expense
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-[#666] text-white">
                <tr>
                  <th className="p-2 border">Sr</th>
                  <th className="p-2 border ">Expense Type</th>
                  <th className="p-2 border">Expense Head</th>
                  <th className="p-2 border">Party</th>
                  <th className="p-2 border">Group</th>
                  <th className="p-2 border">Date</th>

                  <th className="p-2 text-right border">Paid</th>
                  <th className="p-2 text-right border">Due</th>
                  <th className="p-2 text-right border">Total</th>
                  <th className="p-2 text-center border">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center py-10 text-gray-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        Loading data...
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="p-6 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginated.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border hover:bg-gray-50 text-center"
                    >
                      <td className="p-4 text-center">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="p-4 border ">{r.expense_type}</td>
                      <td className="p-4 border">{r.expense_head}</td>
                      <td className="p-4 border">{r.party_name}</td>
                      <td className="p-4 border">
                        {r.expense_group_name || "-"}
                      </td>

                      <td className="p-4">
                        {formatDate(r.date)}
                      </td>

                      <td className="p-4 text-right whitespace-nowrap border">
                        ₹ {r.paid.toFixed(2)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap border">
                        ₹ {r.due.toFixed(2)}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap font-semibold border">
                        ₹ {r.amount.toFixed(2)}
                      </td>

                      <td className="p-4 text-center border">
                        <div className="flex justify-center gap-2">
                          {/* VIEW */}
                          <button
                            onClick={() => setViewRow(r)}
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            <Eye size={16} />
                          </button>

                          {/* EDIT */}
                          <button
                            onClick={async () => {
                              try {
                                const res = await getExpenseById(r.id);

                                setEditingRow(res.data);
                                setMode("edit");
                                setShowForm(true);
                              } catch (err) {
                                console.error(err);
                                showError("Failed to load expense");
                              }
                            }}
                          >
                            <Pencil size={16} />
                          </button>

                          {/* PRINT */}
                          <button onClick={() => handlePrint(r)}>
                            <Printer size={16} />
                          </button>

                          {/* DOWNLOAD (DISABLED) */}

                          {/* DELETE */}
                          <button
                            onClick={() => handleDelete(r)}
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {viewRow && (
            <ExpenseViewModal data={viewRow} onClose={() => setViewRow(null)} />
          )}

          {/* PAGINATION */}
          <div className="flex justify-between items-center p-3 border-t text-sm">
            <div>
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border rounded px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-2 py-1 border rounded"
              >
                ◀
              </button>
              <span>
                {page}/{totalPages || 1}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2 py-1 border rounded"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Card({ title, value, color }) {
  const colorMap = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
  };

  return (
    <div
      className={`min-w-[140px] flex-1 rounded-xl p-4 border ${colorMap[color]}`}
    >
      <div className="text-xs text-gray-500 uppercase tracking-wide">
        {title}
      </div>

      <div className="text-lg font-semibold truncate">
        ₹ {Number(value || 0).toFixed(2)}
      </div>
    </div>
  );
}

function ExpenseViewModal({ data, onClose }) {
  if (!data) return null;
  const handleDownload = async (url, filename = "expense-document") => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
      showError("Download failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-3">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* ===== HEADER ===== */}
        <div className="px-5 py-3 border-b bg-gradient-to-r from-gray-800 to-gray-700 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold tracking-wide">
                Expense Voucher
              </h2>
              <p className="text-xs text-gray-200">
                Voucher #{data.voucher_number || data.id}•{" "}
                <span className="">
                  {formatDate(data.date)}
                </span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ===== BODY ===== */}
        <div className="p-4 bg-gray-50 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* PARTY DETAILS */}
              <section className="bg-white rounded-lg border p-4">
                <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase">
                  Party Details
                </h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <Detail label="Party Name" value={data.party_name} />
                  <Detail label="GST No" value={data.party_gst} />
                  <Detail label="Mobile" value={data.party_phone} />
                  <Detail label="Pincode" value={data.pincode} />
                  <Detail label="City" value={data.city} />
                  <Detail label="State" value={data.state} />
                  <div className="col-span-2">
                    <Detail label="Address" value={data.party_address} />
                  </div>
                </div>
              </section>

              {/* EXPENSE INFO */}
              <section className="bg-white rounded-lg border p-4">
                <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase">
                  Expense Info
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Detail label="Expense Head" value={data.expense_head} />
                  <Detail label="Expense Type" value={data.expense_type} />
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* AMOUNT SUMMARY */}
              <section className="grid grid-cols-3 gap-3">
                <AmountCard label="Total" value={data.amount} />
                <AmountCard label="Paid" value={data.paid} color="green" />
                <AmountCard label="Due" value={data.due} color="red" />
              </section>

              {/* NARRATION */}
              <section className="bg-white rounded-lg border p-4">
                <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase">
                  Narration
                </h3>
                <div className="text-gray-700 text-sm leading-relaxed min-h-[48px]">
                  {data.narration || "—"}
                </div>
              </section>

              {/* DOCUMENT PREVIEW */}
              {data.document && (
                <section className="bg-white rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-5">
                    {/* VIEW */}
                    <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase">
                      Attached Bill
                    </h3>
                    <a
                      href={getDocumentUrl(data.document)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      <Eye size={16} />
                    </a>

                    {/* DOWNLOAD */}
                    <button
                      onClick={() =>
                        handleDownload(
                          getDocumentUrl(data.document),
                          `Expense-${data.voucher_number || data.id}`,
                        )
                      }
                      className="h-9 w-9 flex items-center justify-center rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                  {/* PREVIEW */}
                  {data.document.endsWith(".pdf") ? (
                    <p className="text-sm text-gray-700 mb-3">PDF Document</p>
                  ) : (
                    <img
                      src={getDocumentUrl(data.document)}
                      alt="Expense Document"
                      className="max-h-[220px] rounded-md border object-contain mb-3 select-none"
                      draggable={false}
                    />
                  )}

                  {/* ACTION BUTTONS */}
                </section>
              )}
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="px-5 py-3 border-t bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-md border hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value || "—"}</div>
    </div>
  );
}

function AmountCard({ label, value, color = "gray" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-900",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className={`rounded-lg p-4 ${colors[color]}`}>
      <div className="text-xs mb-1">{label}</div>
      <div className="text-xl font-semibold">
        ₹ {Number(value || 0).toFixed(2)}
      </div>
    </div>
  );
}

const getDocumentUrl = (path) => {
  if (!path) return "";

  // windows path → web path
  const cleanPath = path.replace(/\\/g, "/");

  return `${import.meta.env.VITE_SERVER_URL}/${cleanPath}`;
};
