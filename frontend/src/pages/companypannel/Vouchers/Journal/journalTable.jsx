import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Printer, Trash2, Download, Search } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import VoucherForm from "../Journal/journalForm.jsx";

import {
  getJournalsByCompany,
  deleteJournal,
  getJournalById,
} from "../../../../api";
import { showError } from "../../../../components/ui/alert/Alert.jsx";

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB");
};

const money = (v) => Number(v || 0);

const toYYYYMMDD = (dateObj) => {
  if (!dateObj) return "";
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const Info = ({ label, value, span = 1 }) => (
  <div className={`col-span-${span}`}>
    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
      {label}
    </div>
    <div className="font-semibold text-gray-800">{value || "-"}</div>
  </div>
);

const Field = ({ label, value }) => (
  <div className="space-y-1">
    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
      {label}
    </div>
    <div className="text-[15px] font-semibold text-gray-900 leading-snug">
      {value || "-"}
    </div>
  </div>
);

export default function JurnalVoucherReport() {
  const location = useLocation();
  const [loading, setLocalLoading] = useState(false);
  const params = new URLSearchParams(location.search);
  const editIdFromUrl = params.get("id");
  const COMPANY_ID = JSON.parse(localStorage.getItem("company_data"))?.id;
  const [vouchers, setVouchers] = useState([]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [viewVoucher, setViewVoucher] = useState(null);
  const [mode, setMode] = useState("list");
  const [editVoucherId, setEditVoucherId] = useState(null);

  useEffect(() => {
    if (!COMPANY_ID) return;
    loadVouchers();
  }, [COMPANY_ID]);

  const loadVouchers = async () => {
    try {
      setLocalLoading(true);

      const res = await getJournalsByCompany(COMPANY_ID);
      setVouchers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  const filteredVouchers = useMemo(() => {
    const f = fromDate ? toYYYYMMDD(fromDate) : null;
    const t = toDate ? toYYYYMMDD(toDate) : null;

    return (vouchers || [])
      .filter((v) => v.payment_type !== "thirdparty")
      .filter((v) => {
        if (!f || !t) return true;
        const d = v.voucher_date?.slice(0, 10);
        return d >= f && d <= t;
      })
      .filter((v) => {
        const q = search.toLowerCase();
        return (
          (v.voucher_no || "").toLowerCase().includes(q) ||
          (v.party_name || "").toLowerCase().includes(q) ||
          (v.group_name || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.id - a.id);
  }, [vouchers, fromDate, toDate, search]);

  const summary = {
    total: filteredVouchers.length,
  };

  /* -------------------- Pagination -------------------- */
  const totalPages = Math.ceil(filteredVouchers.length / perPage);
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredVouchers.slice(start, start + perPage);
  }, [filteredVouchers, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [perPage, search, fromDate, toDate]);

  /* -------------------- Actions -------------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this voucher?")) return;

    try {
      setLocalLoading(true);

      await deleteJournal(id);

      // direct UI update (BEST UX)
      setVouchers((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePrint = async (row) => {
    const res = await getJournalById(row.id);
    const { header, entries } = res.data || {};

    if (!header) return showError("Journal not found");

    const company = JSON.parse(localStorage.getItem("company_data") || "{}");

    const companyData = {
      name: company.name || "COMPANY NAME",
      address1: company.address || "",
      address2: `${company.city || ""}, ${company.state || ""} - ${company.pincode || ""}`,
      gst_number: company.gst_number || "-",
      logo: company.logo
        ? `${import.meta.env.VITE_SERVER_URL}/${company.logo}`
        : "https://dummyimage.com/140x45/0f172a/ffffff.png&text=LOGO",
    };

    const voucherDate = formatDate(header.voucher_date);
    const voucherNo = header.voucher_no || "-";

    const rowsHtml = entries
      .map(
        (e, i) => `
      <tr>
        <td>${i + 1}</td>
     <td>${e.ledger_name || "Party Ledger"}</td>

        <td class="right">${Number(e.debit || 0).toFixed(2)}</td>
        <td class="right">${Number(e.credit || 0).toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
  <html>
    <head>
      <title>Journal Voucher</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          background: #fff;
          color: #111;
        }
        .page {
          width: 820px;
          margin: auto;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 18px;
        }
        .top {
          display: flex;
          justify-content: space-between;
        }
        .companyName {
          font-size: 18px;
          font-weight: 800;
        }
        .info {
          font-size: 11px;
          margin-top: 4px;
          line-height: 1.4;
        }
        .hr {
          height: 1px;
          background: #e5e7eb;
          margin: 14px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px;
        }
        th {
          background: #f1f5f9;
          text-align: left;
        }
        .right { text-align: right; }
        .meta {
          font-size: 12px;
          margin-bottom: 6px;
        }
        .note {
          margin-top: 20px;
          font-size: 10px;
          text-align: center;
          color: #555;
        }
        @media print {
          body { padding: 0; }
          .page { border: none; }
        }
      </style>
    </head>

    <body>
      <div class="page">
        <div class="top">
          <div>
            <div class="companyName">${companyData.name}</div>
            <div class="info">
              ${companyData.address1}<br/>
              ${companyData.address2}<br/>
              <b>GSTIN:</b> ${companyData.gst_number}
            </div>
          </div>
          <img src="${companyData.logo}" height="45" />
        </div>

        <div class="hr"></div>

        <div class="meta"><b>Voucher No:</b> ${voucherNo}</div>
        <div class="meta"><b>Date:</b> ${voucherDate}</div>
        <div class="meta"><b>Party:</b> ${header.party_name || "-"}</div>
        <div class="meta"><b>Group:</b> ${header.group_name || "-"}</div>
        ${
          header.item_name
            ? `<div class="meta"><b>Item:</b> ${header.item_name}</div>`
            : ""
        }
        <div class="meta"><b>Narration:</b> ${header.narration || "-"}</div>

        <table>
          <thead>
            <tr>
              <th>Sr</th>
              <th>Ledger</th>
              <th class="right">Debit</th>
              <th class="right">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="note">
          This is a computer generated journal voucher.
        </div>
      </div>
    </body>
  </html>
  `;

    const w = window.open("", "_blank", "width=950,height=750");
    w.document.write(html);
    w.document.close();

    w.onload = () => {
      w.print();
      w.onafterprint = () => w.close();
    };
  };

  const handleDownload = () => {
    const rows = filteredVouchers.map((v, i) => ({
      Sr: i + 1,
      VoucherNo: v.voucher_no,
      Date: formatDate(v.voucher_date),
      Party: v.party_name,
      Group: v.group_name,
      Amount: money(v.amount).toFixed(2),
      Paid: money(v.paid).toFixed(2),
      Due: money(v.due).toFixed(2),
      PaymentType: v.payment_type,
      Narration: v.narration,
    }));

    const csv =
      "Sr,Voucher No,Date,Party,Group,Narration\n" +
      rows
        .map(
          (r) =>
            `${r.Sr},${r.VoucherNo},${r.Date},${r.Party},${r.Group},${r.Narration}`,
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "voucher_report.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setViewVoucher(null);
        setMode("list");
        setEditVoucherId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (mode !== "list") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [mode]);

  const summaryAmounts = useMemo(() => {
    return filteredVouchers.reduce(
      (acc, v) => {
        acc.amount += money(v.amount);
        acc.paid += money(v.paid);
        acc.due += money(v.due);
        return acc;
      },
      { amount: 0, paid: 0, due: 0 },
    );
  }, [filteredVouchers]);

  const handleDateSearch = () => {
    if (!fromDate || !toDate) {
      showError("Please select both dates!");
      return;
    }

    if (fromDate > toDate) {
      showError("From Date should be smaller than To Date");
      return;
    }

    loadVouchers(); // yaha loader chahiye
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {mode !== "list" && (
        <VoucherForm
          voucherId={editVoucherId}
          companyId={COMPANY_ID}
          onClose={() => {
            setMode("list");
            setEditVoucherId(null);
            loadVouchers();
          }}
        />
      )}

      {mode === "list" && (
        <>
          {/* TOP FILTER BAR */}
          {/* <div className="bg-white border rounded-xl p-4">
            <div className=" flex flex-wrap items-center gap-4">
              <div className="w-[170px] rounded-lg p-4 bg-blue-100 border">
                <div className="text-sm text-gray-600">Paid</div>
                <div className="text-lg font-semibold">
                  ₹ {summaryAmounts.paid.toFixed(2)}
                </div>
              </div>
              <div className="text-xl font-semibold text-gray-500">+</div>

              <div className="w-[170px] rounded-lg p-4 bg-orange-200 border">
                <div className="text-sm text-gray-600">Due</div>
                <div className="text-lg font-semibold">
                  ₹{summaryAmounts.due.toFixed(2)}
                </div>
              </div>
              <div className="text-xl font-semibold text-gray-500">=</div>

              <div className="w-[170px] rounded-lg p-4 bg-green-100 border">
                <div className="text-sm text-gray-600">Total Amount</div>
                <div className="text-lg font-semibold">
                  ₹ {summaryAmounts.amount.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <span className="text-sm px-3 py-2 bg-gray-100 rounded-md self-start sm:self-auto">
                  Between
                </span>

                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  dateFormat="dd-mm-yyyy"
                  placeholderText="DD-MM-YYYY"
                  className="h-10 border rounded-md px-3 text-sm w-full sm:w-[150px]"
                />

                <span className="text-sm text-gray-500 self-start sm:self-auto">
                  To
                </span>

                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="DD-MM-YYYY"
                  className="h-10 border rounded-md px-3 text-sm w-full sm:w-[150px]"
                />

                <button
                  type="button"
                  onClick={handleDateSearch}
                  className="h-10 px-4 rounded-md bg-[#22A586] text-white font-semibold hover:opacity-90 w-full sm:w-auto flex items-center justify-center"
                >
                  Search
                </button>
              </div>
            </div>

          </div> */}

          {/* TOP FILTER BAR */}
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            {/* Summary Cards */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Paid */}
              <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-blue-50 border">
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Paid
                </div>
                <div className="text-lg font-semibold text-blue-700 truncate">
                  ₹ {Number(summaryAmounts.paid || 0).toFixed(2)}
                </div>
              </div>

              <div className="text-lg font-semibold text-gray-400">+</div>

              {/* Due */}
              <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-orange-50 border">
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Due
                </div>
                <div className="text-lg font-semibold text-orange-600 truncate">
                  ₹ {Number(summaryAmounts.due || 0).toFixed(2)}
                </div>
              </div>

              <div className="text-lg font-semibold text-gray-400">=</div>

              {/* Total */}
              <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-green-50 border">
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Total Amount
                </div>
                <div className="text-lg font-semibold text-green-700 truncate">
                  ₹ {Number(summaryAmounts.amount || 0).toFixed(2)}
                </div>
              </div>
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

          {/* TABLE HEADER BAR */}
          <div className="bg-white border rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h3 className="text-sm font-bold text-gray-900">
                  All Jurnal Voucher Report
                </h3>
                <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full w-fit">
                  {filteredVouchers.length} Records
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-[240px]">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Voucher No..."
                    className="h-[36px] w-[240px] border border-gray-300 rounded-md pl-10 pr-3 text-sm focus:outline-none focus:border-[#FF4200]"
                  />
                  <Search
                    size={16}
                    className="absolute left-3 top-[10px] text-gray-500"
                  />
                </div>

                <button
                  onClick={handleDownload}
                  className="h-[36px] w-full sm:w-auto px-3 rounded-md bg-yellow-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Export
                </button>

                <button
                  onClick={() => {
                    setMode("create");
                    setEditVoucherId(null);
                  }}
                  className="h-[36px] w-full sm:w-auto px-4 bg-[#22A586] text-white rounded-md text-sm font-medium"
                >
                  + Create Journal
                </button>
              </div>
            </div>

            {/* Pagination line */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-xs text-gray-600">
                Showing {(page - 1) * perPage + 1} to{" "}
                {Math.min(page * perPage, filteredVouchers.length)} of{" "}
                {filteredVouchers.length}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="h-[32px] border border-gray-300 rounded-md px-2 text-sm"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto bg-white rounded-xl border shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left border">#</th>
                    <th className="px-4 py-3 text-left border">Voucher No</th>
                    <th className="px-4 py-3 text-left border">Date</th>
                    <th className="px-4 py-3 text-left border">Party</th>
                    <th className="px-4 py-3 text-left border">Group</th>
                    <th className="px-4 py-3 text-right border">Amount</th>
                    <th className="px-4 py-3 text-right border">Paid</th>
                    <th className="px-4 py-3 text-right border">Due</th>
                    <th className="px-4 py-3 text-left border">Pay Type</th>
                    <th className="px-4 py-3 text-center border">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {/* ✅ LOADING STATE */}
                  {loading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-10 text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          {/* <div className="h-6 w-6 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div> */}
                          Loading data...
                        </div>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    /* ✅ EMPTY STATE */
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-16 text-gray-400"
                      >
                        No journal vouchers found
                      </td>
                    </tr>
                  ) : (
                    /* ✅ DATA */
                    paginated.map((v, index) => (
                      <tr
                        key={v.id}
                        className="border last:border-b-0 hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-3 border">
                          {(page - 1) * perPage + index + 1}
                        </td>

                        <td className="px-4 py-3 border">{v.voucher_no}</td>

                        <td className="px-4 py-3 border">
                          {formatDate(v.voucher_date)}
                        </td>

                        <td className="px-4 py-3 border">
                          {v.party_name || "-"}
                        </td>

                        <td className="px-4 py-3 border">
                          {v.group_name || "-"}
                        </td>

                        <td className="px-4 py-3 border">
                          {money(v.amount).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right text-green-700 border">
                          {money(v.paid).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right text-red-600 border">
                          {money(v.due).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 capitalize border">
                          {v.payment_type || "-"}
                        </td>

                        <td className="px-4 py-3 border">
                          <div className="flex justify-center gap-2">
                            {/* VIEW */}
                            <button
                              title="View"
                              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                              onClick={async () => {
                                const res = await getJournalById(v.id);
                                setViewVoucher({
                                  ...res.data.header,
                                  entries: res.data.entries,
                                });
                              }}
                            >
                              <Eye size={16} />
                            </button>

                            {/* EDIT */}
                            <button
                              title="Edit"
                              onClick={() => {
                                setMode("edit");
                                setEditVoucherId(v.id);
                              }}
                              className="p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* PRINT */}
                            <button
                              title="Print"
                              onClick={() => handlePrint(v)}
                              className="p-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                            >
                              <Printer size={16} />
                            </button>

                            {/* DELETE */}
                            <button
                              title="Delete"
                              onClick={() => handleDelete(v.id)}
                              className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
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

            {/* Bottom Pagination */}
            <div className="flex items-center justify-end gap-2 p-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              <span className="text-sm font-semibold">
                {page} / {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>

            {viewVoucher && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                <div className="bg-white w-[820px] rounded-xl shadow-2xl overflow-hidden">
                  {/* ===== HEADER ===== */}
                  <div className="flex justify-between items-center px-6 py-4 border-b">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Journal Voucher
                      </h3>
                      <p className="text-xs text-gray-500">
                        Voucher No: {viewVoucher.voucher_no || "-"}
                      </p>
                    </div>

                    <button
                      onClick={() => setViewVoucher(null)}
                      className="text-xl text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>

                  {/* ===== BODY ===== */}
                  <div className="px-8 py-6 space-y-8 text-sm">
                    {/* ---- INFO GRID ---- */}
                    <div className="grid grid-cols-4 gap-6 pt-4 border-t">
                      <Field
                        label="Total Amount"
                        value={money(viewVoucher.amount).toFixed(2)}
                      />
                      <Field
                        label="Paid Amount"
                        value={money(viewVoucher.paid).toFixed(2)}
                      />
                      <Field
                        label="Due Amount"
                        value={money(viewVoucher.due).toFixed(2)}
                      />
                      <Field
                        label="Payment Type"
                        value={(viewVoucher.payment_type || "-").toUpperCase()}
                      />
                    </div>

                    {/* ---- NARRATION ---- */}
                    <div>
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Narration
                      </div>

                      <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-[14px] text-gray-800 leading-relaxed min-h-[72px]">
                        {viewVoucher.narration || "-"}
                      </div>
                    </div>
                  </div>

                  {/* ===== FOOTER ===== */}
                  <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
                    <button
                      onClick={() => setViewVoucher(null)}
                      className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100"
                    >
                      Close
                    </button>

                    <button
                      onClick={() => {
                        setViewVoucher(null);
                        setMode("edit");
                        setEditVoucherId(viewVoucher.id);
                      }}
                      className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit Journal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
