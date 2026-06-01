import React, { useEffect, useState } from "react";
import { Search, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getCreditNoteReport } from "../../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function CreditNoteReport() {
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const today = new Date();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [showExportMenu, setShowExportMenu] = useState(false);

  const toLocal = (d) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  const loadReport = async () => {
    try {
      setLoading(true);

      const res = await getCreditNoteReport({
        company_id: companyId,
        fromDate: toLocal(fromDate),
        toDate: toLocal(toDate),
        search,
        page,
        limit: rowsPerPage,
      });

      const response = res?.data;

      setData(response?.data || []);
      setSummary(response?.summary || {});
    } catch (err) {
      console.error(err);
      setData([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate]);

  useEffect(() => {
    loadReport();
  }, [page, search]);

  const totalPages = Math.ceil((summary?.total || 0) / rowsPerPage);
  const start = (page - 1) * rowsPerPage;
  const end = start + data.length;

  const rows = data;

  /* ================= PDF EXPORT ================= */

  const exportPDF = async () => {
    const company = JSON.parse(localStorage.getItem("company_data")) || {};

    const doc = new jsPDF("l", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const today = new Date().toLocaleDateString("en-GB");

    /* LOGO */

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

    /* COMPANY NAME */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    doc.text(
      (company.name || "COMPANY NAME").toUpperCase(),
      pageWidth / 2,
      12,
      { align: "center" },
    );

    /* ADDRESS */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const infoLine = [
      [company.city, company.state, company.pincode].filter(Boolean).join(" "),
      company.gst_number ? `GSTIN: ${company.gst_number}` : null,
    ]
      .filter(Boolean)
      .join("   |   ");

    doc.text(infoLine, pageWidth / 2, 17, { align: "center" });

    if (company.address) {
      doc.text(company.address, pageWidth / 2, 21, { align: "center" });
    }

    /* LINE */

    doc.setDrawColor(180);
    doc.line(14, 25, pageWidth - 14, 25);

    /* TITLE */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);

    doc.text("CREDIT NOTE REPORT", pageWidth / 2, 32, { align: "center" });

    /* SUMMARY */

    doc.setFontSize(9);

    doc.text(`Date : ${today}`, 14, 38);

    doc.setFont("helvetica", "bold");

    doc.setTextColor(0, 150, 0); // Green color

    doc.text(
      `Total Credit : Rs ${Number(summary.total_credit || 0).toFixed(2)}`,
      pageWidth - 14,
      38,
      { align: "right" },
    );

    doc.setTextColor(0, 0, 0); // Reset to black (important)

    /* TABLE */

    const tableData = data.map((r, i) => [
      i + 1,
      formatDate(r.voucher_date),
      r.credit_note_no,
      r.sale_invoice_no,
      r.party_name,
      Number(r.total_amount).toFixed(2),
      r.narration || "",
    ]);

    autoTable(doc, {
      startY: 42,
      margin: { left: 14, right: 14 },

      head: [
        ["Sr", "Date", "Credit Note", "Invoice", "Party", "Amount", "Remark"],
      ],

      body: tableData,

      theme: "grid",

      styles: {
        fontSize: 9,
        cellPadding: 3,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
      },

      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },

      columnStyles: {
        5: { halign: "right" },
      },
    });

    doc.save(`Credit_Note_Report_${today.replace(/\//g, "-")}.pdf`);
  };

  /* ================= EXCEL EXPORT ================= */

  const exportExcel = () => {
    const rows = data.map((r, i) => ({
      Sr: i + 1,
      Date: formatDate(r.voucher_date),
      CreditNote: r.credit_note_no,
      Invoice: r.sale_invoice_no,
      Party: r.party_name,
      Amount: r.total_amount,
      Remark: r.narration,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Credit Note Report");

    XLSX.writeFile(wb, "Credit_Note_Report.xlsx");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Credit Note Report
          </h1>

          <p className="text-sm text-gray-500">
            List of all credit notes issued against sales invoices
          </p>
        </div>
      </div>
      {/* SUMMARY */}

      <div className="bg-white border rounded-lg p-4">
        <p className="text-gray-500 text-sm">Total Credit Note</p>

        <h2 className="text-xl font-semibold text-green-600">
          ₹ {Number(summary.total_credit || 0).toFixed(2)}
        </h2>
      </div>

      {/* FILTER BAR */}

      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party / invoice"
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64"
          />
        </div>

        <DatePicker
          selected={fromDate}
          onChange={setFromDate}
          dateFormat="dd/MM/yyyy"
          className="border px-3 py-2 rounded-lg text-sm w-36"
        />

        <DatePicker
          selected={toDate}
          onChange={setToDate}
          dateFormat="dd/MM/yyyy"
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

      {/* TABLE */}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Loading report...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Credit Note</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Remark</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{start + i + 1}</td>

                  <td className="px-4 py-3">{formatDate(r.voucher_date)}</td>

                  <td className="px-4 py-3">{r.credit_note_no}</td>

                  <td className="px-4 py-3">{r.sale_invoice_no}</td>

                  <td className="px-4 py-3">
                    {r.party_name} {r.party_id && `[${r.party_id}]`}
                  </td>

                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    ₹ {Number(r.total_amount).toFixed(2)}
                  </td>

                  <td className="px-4 py-3">{r.narration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4">
        {/* LEFT INFO */}

        <div className="text-sm text-gray-500">
          Showing {start + 1} to {end} of {summary?.total || 0}
        </div>

        {/* RIGHT CONTROLS */}

        <div className="flex items-center gap-2">
          {/* PREV */}
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            Prev
          </button>

          {/* PAGE NUMBERS */}
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded-md text-sm ${
                page === i + 1
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}

          {/* NEXT */}
          <button
            disabled={data.length < rowsPerPage}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
