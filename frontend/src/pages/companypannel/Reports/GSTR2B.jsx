import React, { useState, useEffect, useMemo } from "react";
import { getGSTR2B } from "../../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Search, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { showError } from "../../../components/ui/alert/Alert";

const API_BASE = import.meta.env.VITE_SERVER_URL;

const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {

    if (!url) return resolve(null);

    let fullUrl = url;

    if (!url.startsWith("http")) {
      fullUrl = `${API_BASE}/${url}`;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = function () {

      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => resolve(null);

    img.src = fullUrl;

  });
};

export default function GSTR2B() {
  // ================= DEFAULT DATES =================
  const today = new Date();

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const lastDay = today.toISOString().split("T")[0];

  // ================= STATES =================

  const [from, setFrom] = useState(new Date());
  const [to, setTo] = useState(new Date());

  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [perPage, setPerPage] = useState(10);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const toLocalYYYYMMDD = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // ================= FETCH =================

  const fetchReport = async (fromDate = from, toDate = to) => {
    try {
      setLoading(true);

      const res = await getGSTR2B({
        from: toLocalYYYYMMDD(from),
        to: toLocalYYYYMMDD(to),
      });

      setData(res.data.data || []);

      setCurrentPage(1);
    } catch (error) {
      showError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(firstDay, lastDay);
  }, []);

  // ================= SEARCH FILTER =================

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.supplier_invoice_no
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        item.company_name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

  // ================= PAGINATION =================

  const totalPages = Math.ceil(filteredData.length / perPage);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ================= SUMMARY =================

  const totalGST = useMemo(() => {
    return filteredData.reduce(
      (sum, row) => sum + Number(row.gst_amount || 0),
      0,
    );
  }, [filteredData]);

  // ================= UI =================
  const exportExcel = () => {
    const rows = filteredData.map((r, i) => ({
      Sr: i + 1,
      Invoice: r.supplier_invoice_no,
      Date: new Date(r.voucher_date).toLocaleDateString("en-IN"),
      Supplier: r.company_name,
      GST: r.gst_amount,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "GSTR2B");

    XLSX.writeFile(wb, "GSTR2B_Report.xlsx");
  };

const exportPDF = async () => {

  try {

    const company =
      JSON.parse(localStorage.getItem("company_data")) || {};

    const doc = new jsPDF("l", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const today = new Date().toLocaleDateString("en-GB");

    let y = 12;

    /* ================= LOGO ================= */

    const base64Logo = await loadImageAsBase64(company.logo);

    let logoWidth = 0;
    let logoHeight = 0;

    const logoX = 14;
    const logoY = 6;

    if (base64Logo) {

      const img = new Image();
      img.src = base64Logo;

      await new Promise((resolve) => (img.onload = resolve));

      const maxWidth = 42;
      const maxHeight = 18;

      logoWidth = maxWidth;
      logoHeight = (img.height / img.width) * logoWidth;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = (img.width / img.height) * logoHeight;
      }

      doc.addImage(base64Logo, "PNG", logoX, logoY, logoWidth, logoHeight);
    }

    /* ================= HEADER ================= */

    const headerCenterY = logoHeight > 0 ? logoY + logoHeight / 2 : y;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    doc.text(
      (company.name || "COMPANY NAME").toUpperCase(),
      pageWidth / 2,
      headerCenterY - 2,
      { align: "center" }
    );

    /* ================= COMPANY INFO ================= */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const infoLine = [
      [company.city, company.state, company.pincode].filter(Boolean).join(" "),
      company.mobile ? `Mob: ${company.mobile}` : null,
      company.gst_number ? `GSTIN: ${company.gst_number}` : null,
    ]
      .filter(Boolean)
      .join("   |   ");

    if (infoLine) {
      doc.text(infoLine, pageWidth / 2, headerCenterY + 4, {
        align: "center",
      });
    }

    if (company.address) {

      doc.setFontSize(8.5);

      doc.text(company.address, pageWidth / 2, headerCenterY + 9, {
        align: "center",
        maxWidth: pageWidth - 60,
      });
    }

    /* ================= DIVIDER ================= */

    doc.setDrawColor(180);

    doc.line(
      14,
      headerCenterY + 13,
      pageWidth - 14,
      headerCenterY + 13
    );

    /* ================= TITLE ================= */

    y = headerCenterY + 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);

    doc.text("GSTR-2B REPORT", pageWidth / 2, y, { align: "center" });

    /* ================= SUMMARY ================= */

    const gstTotal = filteredData.reduce(
      (sum, r) => sum + Number(r.gst_amount || 0),
      0
    );

    y += 8;

    doc.setFontSize(9);

    doc.text(`Date : ${today}`, 14, y);

    doc.setFont("helvetica", "bold");

    doc.setTextColor(0, 140, 0);

    doc.text(
      `Total GST : Rs ${gstTotal.toFixed(2)}`,
      pageWidth - 14,
      y,
      { align: "right" }
    );

    doc.setTextColor(0);

    /* ================= TABLE ================= */

    y += 6;

    const tableData = filteredData.map((r, i) => [
      i + 1,
      r.supplier_invoice_no,
      new Date(r.voucher_date).toLocaleDateString("en-IN"),
      r.company_name,
      Number(r.gst_amount).toFixed(2),
    ]);

    autoTable(doc, {
      startY: y,

      margin: { left: 14, right: 14 },

      head: [["Sr", "Invoice", "Date", "Supplier", "GST Amount"]],

      body: tableData,

      theme: "grid",

      styles: {
        fontSize: 8.5,
        cellPadding: 3,
      },

      headStyles: {
        fillColor: [55, 65, 81],
        textColor: 255,
      },

      columnStyles: {
        0: { halign: "center" },
        4: { halign: "right" },
      },
    });

    /* ================= FOOTER ================= */

    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {

      doc.setPage(i);

      doc.setFontSize(8);
      doc.setTextColor(150);

      doc.text(company.name || "", 14, pageHeight - 8);

      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: "right" }
      );
    }

    doc.save(`GSTR2B_Report_${today.replace(/\//g, "-")}.pdf`);

  } catch (err) {

    console.error(err);

  }
};

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">GSTR-2B Report</h1>
      </div>

      {/* SUMMARY CARD */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">Total Input GST</p>

          <h2 className="text-xl font-bold text-green-600">
            ₹{totalGST.toLocaleString("en-IN")}
          </h2>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-xs text-gray-500">From</label>
          <DatePicker
            selected={from}
            onChange={(date) => setFrom(date)}
            dateFormat="dd-MM-yyyy"
            className="border px-3 py-2 rounded text-sm w-36"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">To</label>
          <DatePicker
            selected={to}
            onChange={(date) => setTo(date)}
            dateFormat="dd-MM-yyyy"
            className="border px-3 py-2 rounded text-sm w-36"
          />
        </div>

        <button
          onClick={() => fetchReport()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Search
        </button>

        <div className="relative ml-auto">
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
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* TABLE TOP */}
        <div className="flex justify-between items-center p-3 border-b">
          <div>
            Show
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="border mx-2 px-2 py-1"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            entries
          </div>

          <div>Total: {filteredData.length}</div>
        </div>

        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-3 text-left">Invoice No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-right">GST Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan="4" className="text-center p-5">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedData.map((row, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      {row.supplier_invoice_no}
                    </td>

                    <td className="p-3">
                      {new Date(row.voucher_date).toLocaleDateString("en-IN")}
                    </td>

                    <td className="p-3">{row.company_name}</td>

                    <td className="p-3 text-right font-semibold text-green-600">
                      ₹{Number(row.gst_amount).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center p-3 border-t">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
