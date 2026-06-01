import React, { useEffect, useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getTdsReport } from "../../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";

const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date)) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export default function TdsReport() {
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [company, setCompany] = useState(null);
  const today = new Date();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showExportMenu, setShowExportMenu] = useState(false);


  useEffect(() => {
    loadReport();
  }, []);

  /* ================= FILTER ================= */

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return data.filter((n) => {
      const matchSearch =
        n.party_name?.toLowerCase().includes(q) ||
        String(n.purchase_bill_id || "").includes(q) ||
        String(n.expense_id || "").includes(q);

      const matchStatus = status === "ALL" || n.paid_status === status;

      const matchType =
        type === "ALL" ||
        (type === "PURCHASE" && n.purchase_bill_id) ||
        (type === "EXPENSE" && n.expense_id);
      return matchSearch && matchStatus && matchType;
    });
  }, [data, search, status, type]);

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  const rows = filtered.slice(start, end);

  useEffect(() => {
    setPage(1);
  }, [search, status, type, rowsPerPage]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("company_data") || "{}");
    setCompany(data);
  }, []);

  const toLocalYYYYMMDD = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const loadReport = async () => {
    try {
      setLoading(true);

      const res = await getTdsReport(
        companyId,
        toLocalYYYYMMDD(fromDate),
        toLocalYYYYMMDD(toDate),
      );

      setData(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error(err);
      showError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    try {
      const company = JSON.parse(localStorage.getItem("company_data")) || {};

      const doc = new jsPDF("p", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const today = new Date().toLocaleDateString("en-GB");

      let y = 12;

      /* ================= LOGO ================= */

      let logoBase64 = null;

      if (company.logo) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = `${import.meta.env.VITE_SERVER_URL}/${company.logo}`;

        await new Promise((resolve) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            logoBase64 = canvas.toDataURL("image/png");
            resolve();
          };
          img.onerror = resolve;
        });
      }

      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 14, 6, 40, 16);
      }

      /* ================= COMPANY NAME ================= */

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);

      doc.text(
        (company.name || "COMPANY NAME").toUpperCase(),
        pageWidth / 2,
        12,
        { align: "center" },
      );

      /* ================= ADDRESS ================= */

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const infoLine = [
        [company.city, company.state, company.pincode]
          .filter(Boolean)
          .join(" "),
        company.gst_number ? `GSTIN: ${company.gst_number}` : null,
      ]
        .filter(Boolean)
        .join("   |   ");

      doc.text(infoLine, pageWidth / 2, 17, { align: "center" });

      if (company.address) {
        doc.text(company.address, pageWidth / 2, 21, { align: "center" });
      }

      /* ================= DIVIDER ================= */

      doc.setDrawColor(180);
      doc.line(14, 25, pageWidth - 14, 25);

      /* ================= REPORT TITLE ================= */

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      doc.text("TDS REPORT", pageWidth / 2, 32, { align: "center" });

      /* ================= SUMMARY ================= */

      const totalTds = filtered.reduce(
        (sum, r) => sum + Number(r.tds_amount || 0),
        0,
      );

      const paidTds = filtered
        .filter((r) => r.paid_status === "PAID")
        .reduce((sum, r) => sum + Number(r.tds_amount || 0), 0);

      const pendingTds = filtered
        .filter((r) => r.paid_status !== "PAID")
        .reduce((sum, r) => sum + Number(r.tds_amount || 0), 0);

      doc.setFontSize(9);

      doc.text(`Date : ${today}`, 14, 38);

      doc.setFont("helvetica", "bold");

      doc.text(`Total : Rs ${totalTds.toFixed(2)}`, pageWidth / 2 - 30, 38);

      doc.setTextColor(0, 140, 0);
      doc.text(`Paid : Rs ${paidTds.toFixed(2)}`, pageWidth / 2 + 20, 38);

      doc.setTextColor(200, 0, 0);
      doc.text(`Due : Rs ${pendingTds.toFixed(2)}`, pageWidth - 14, 38, {
        align: "right",
      });

      doc.setTextColor(0);

      /* ================= TABLE ================= */

      const tableData = filtered.map((r, index) => [
        index + 1,
        r.party_name,
        formatDate(r.transaction_date),
        r.expense_id ? "EXPENSE" : "PURCHASE",
        r.purchase_bill_no || r.expense_bill_no,
        Number(r.tds_amount).toFixed(2),
        r.paid_status,
      ]);

      autoTable(doc, {
        startY: 42,
        margin: { left: 14, right: 14 },

        head: [["Sr", "Party", "Date", "Type", "Bill", "TDS", "Status"]],

        body: tableData,

        theme: "grid",

        styles: {
          fontSize: 9,
          cellPadding: 3,
        },

        headStyles: {
          fillColor: [55, 65, 81],
          textColor: 255,
          fontStyle: "bold",
        },

        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          5: { halign: "right" },
          6: { halign: "center" },
        },
      });

      /* ================= FOOTER ================= */

      const pageCount = doc.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setFontSize(8);
        doc.setTextColor(140);

        doc.text(company.name || "", 14, pageHeight - 8);

        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
          align: "right",
        });
      }

      doc.save(`TDS_Report_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  const exportExcel = () => {
    const data = filtered.map((r, i) => ({
      Sr: i + 1,
      Party: r.party_name,
      Date: formatDate(r.transaction_date),
      Type: r.expense_id ? "EXPENSE" : "PURCHASE",
      Bill: r.purchase_bill_no || r.expense_bill_no,
      TDS: r.tds_amount,
      Status: r.paid_status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "TDS Report");

    XLSX.writeFile(workbook, "TDS_Report.xlsx");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">TDS Report</h1>

          <p className="text-sm text-gray-500">
            Summary of TDS deducted on purchase and expense bills
          </p>
        </div>
      </div>
      {/* ================= CARDS ================= */}

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-500 text-sm">Total TDS</p>
          <h2 className="text-xl font-semibold text-blue-600">
            ₹ {Number(summary.total_tds || 0).toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-500 text-sm">Paid TDS</p>
          <h2 className="text-xl font-semibold text-green-600">
            ₹ {Number(summary.paid_tds || 0).toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-500 text-sm">Pending TDS</p>
          <h2 className="text-xl font-semibold text-red-600">
            ₹ {Number(summary.pending_tds || 0).toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-500 text-sm">Purchase TDS</p>
          <h2 className="text-xl font-semibold text-purple-600">
            ₹ {Number(summary.purchase_tds || 0).toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-gray-500 text-sm">Expense TDS</p>
          <h2 className="text-xl font-semibold text-orange-600">
            ₹ {Number(summary.expense_tds || 0).toFixed(2)}
          </h2>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}

      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party / bill"
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-3 py-2 rounded-lg text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border px-3 py-2 rounded-lg text-sm"
        >
          <option value="ALL">All Types</option>
          <option value="PURCHASE">Purchase</option>
          <option value="EXPENSE">Expense</option>
        </select>

        <DatePicker
          selected={fromDate}
          onChange={setFromDate}
          dateFormat="dd/MM/yyyy"
          placeholderText="From Date"
          className="border px-3 py-2 rounded-lg text-sm w-36"
        />

        <DatePicker
          selected={toDate}
          onChange={setToDate}
          dateFormat="dd/MM/yyyy"
          placeholderText="To Date"
          className="border px-3 py-2 rounded-lg text-sm w-36"
        />

        <button
          onClick={loadReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Search
        </button>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            Export
            <ChevronDown size={16} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow">
              <button
                onClick={exportPDF}
                className="w-full text-left px-4 py-2 hover:bg-red-50 flex gap-2 items-center"
              >
                <FileText size={16} className="text-red-600" />
                Export PDF
              </button>

              <button
                onClick={exportExcel}
                className="w-full text-left px-4 py-2 hover:bg-green-50 flex gap-2 items-center"
              >
                <FileSpreadsheet size={16} className="text-green-600" />
                Export Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= TABLE ================= */}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Loading report...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Party</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Bill</th>
                <th className="px-4 py-3 text-left">Payment type</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.id}-${i}`} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{start + i + 1}</td>

                  {/* <td className="px-4 py-3 font-medium">{r.party_name}</td> */}

                  <td className="px-4 py-3 font-medium">
                    {r.party_name}{" "}
                    {/* {r.party_id && (
                      <span className="font-medium text-xs">
                        [{r.party_id}]
                      </span>
                    )} */}
                  </td>

                  <td className="px-4 py-3">
                    {formatDate(r.transaction_date)}
                  </td>

                  <td className="px-4 py-3">
                    {r.expense_id ? "EXPENSE" : "PURCHASE"}
                  </td>

                  <td className="px-4 py-3">
                    {r.purchase_bill_no || r.expense_bill_no}
                  </td>

                  <td className="px-4 py-3">
                    {r.payment_type || "-"}
                    {r.payment_type === "BANK" && r.bank_name && (
                      <span className=" text-xs ml-1">[{r.bank_name}]</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    ₹ {Number(r.tds_amount || 0).toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        r.paid_status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.paid_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= PAGINATION ================= */}

      <div className="flex justify-between items-center text-sm">
        <div>
          Showing {start + 1} to {Math.min(end, filtered.length)} of{" "}
          {filtered.length}
        </div>

        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>

          <span className="px-3 py-1 border rounded bg-gray-100">
            {page} / {totalPages || 1}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
