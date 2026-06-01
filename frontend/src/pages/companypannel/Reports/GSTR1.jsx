import React, { useState, useEffect, useMemo } from "react";
import { getGSTR1, getCompanyProfile } from "../../../api";
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

    img.onerror = function () {
      console.warn("Logo failed to load");
      resolve(null);
    };

    img.src = fullUrl;
  });
};

export default function GSTR1() {
  // ================= DATES =================
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = today.toISOString().split("T")[0];
  // ================= STATES =================
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [company, setCompany] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const toLocalYYYYMMDD = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const exportExcel = () => {
    const rows = filteredData.map((r, i) => ({
      Sr: i + 1,
      Invoice: r.invoice_no,
      Date: new Date(r.voucher_date).toLocaleDateString("en-IN"),
      Party: r.company_name,
      GSTIN: r.gst_number,
      Taxable: r.taxable_value,
      GST: r.gst_amount,
      Total: r.invoice_value,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "GSTR1");

    XLSX.writeFile(wb, "GSTR1_Report.xlsx");
  };

  const exportPDF = async () => {
    try {
      if (!company) return;

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

      /* ================= HEADER ALIGN ================= */

      const headerCenterY = logoHeight > 0 ? logoY + logoHeight / 2 : y;

      /* ================= COMPANY NAME ================= */

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);

      doc.text(
        (company.name || "COMPANY NAME").toUpperCase(),
        pageWidth / 2,
        headerCenterY - 2,
        { align: "center" },
      );

      /* ================= COMPANY INFO ================= */

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const infoLine = [
        [company.city, company.state, company.pincode]
          .filter(Boolean)
          .join(" "),
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
      doc.line(14, headerCenterY + 13, pageWidth - 14, headerCenterY + 13);

      /* ================= TITLE ================= */

      y = headerCenterY + 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      doc.text("GSTR-1 REPORT", pageWidth / 2, y, { align: "center" });

      /* ================= SUMMARY ================= */

      const taxable = filteredData.reduce(
        (s, r) => s + Number(r.taxable_value || 0),
        0,
      );

      const gst = filteredData.reduce(
        (s, r) => s + Number(r.gst_amount || 0),
        0,
      );

      const total = filteredData.reduce(
        (s, r) => s + Number(r.invoice_value || 0),
        0,
      );

      y += 8;

      doc.setFontSize(9);

      doc.text(`Date : ${today}`, 14, y);

      doc.setFont("helvetica", "bold");

      doc.text(`Taxable : Rs ${taxable.toFixed(2)}`, pageWidth / 2 - 40, y);

      doc.setTextColor(0, 140, 0);
      doc.text(`GST : Rs ${gst.toFixed(2)}`, pageWidth / 2 + 20, y);

      doc.setTextColor(0);
      doc.text(`Total : Rs ${total.toFixed(2)}`, pageWidth - 14, y, {
        align: "right",
      });

      /* ================= TABLE ================= */

      y += 6;

      const tableData = filteredData.map((r, i) => [
        i + 1,
        r.invoice_no,
        new Date(r.voucher_date).toLocaleDateString("en-IN"),
        r.company_name,
        r.gst_number,
        Number(r.taxable_value).toFixed(2),
        Number(r.gst_amount).toFixed(2),
        Number(r.invoice_value).toFixed(2),
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [
          [
            "Sr",
            "Invoice",
            "Date",
            "Party",
            "GSTIN",
            "Taxable",
            "GST",
            "Total",
          ],
        ],
        body: tableData,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255 },
        columnStyles: {
          0: { halign: "center" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
        },
      });

      /* ================= FOOTER ================= */

      const pageCount = doc.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setFontSize(8);
        doc.setTextColor(150);

        doc.text(company.name || "", 14, pageHeight - 8);

        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
          align: "right",
        });
      }

      doc.save(`GSTR1_Report_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const res = await getCompanyProfile();
        setCompany(res.data.data);
      } catch (err) {
        console.error("Company load failed", err);
      }
    };

    loadCompany();
  }, []);
  // ================= FETCH =================

  const fetchReport = async (fromDate = from, toDate = to) => {
    try {
      setLoading(true);

      const res = await getGSTR1({
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
        item.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
        item.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.gst_number?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

  // ================= PAGINATION =================
  const totalPages = Math.ceil(filteredData.length / perPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ================= SUMMARY =================

  const summary = useMemo(() => {
    const taxable = filteredData.reduce(
      (sum, row) => sum + Number(row.taxable_value || 0),
      0,
    );

    const gst = filteredData.reduce(
      (sum, row) => sum + Number(row.gst_amount || 0),
      0,
    );

    const total = filteredData.reduce(
      (sum, row) => sum + Number(row.invoice_value || 0),
      0,
    );

    return { taxable, gst, total };
  }, [filteredData]);
  // ================= UI =================

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">GSTR-1 Report</h1>
      </div>

      {/* FILTER BAR */}
      {/* <div className="bg-white shadow rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm text-gray-600">From</label>
          <DatePicker
            selected={from}
            onChange={(date) => setFrom(date)}
            dateFormat="dd-MM-yyyy"
            className="border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">To</label>
          <DatePicker
            selected={to}
            onChange={(date) => setTo(date)}
            dateFormat="dd-MM-yyyy"
            className="border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={() => fetchReport()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
        >
          Search
        </button>

   
      </div> */}

      <div className="bg-white shadow rounded-lg p-4 flex flex-wrap gap-3 items-center">
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

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">Taxable Value</p>
          <h2 className="text-xl font-bold text-blue-600">
            ₹{summary.taxable.toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">GST Amount</p>
          <h2 className="text-xl font-bold text-green-600">
            ₹{summary.gst.toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-gray-600">Total Invoice</p>
          <h2 className="text-xl font-bold text-purple-600">
            ₹{summary.total.toLocaleString("en-IN")}
          </h2>
        </div>
      </div>

      {/* TABLE */}
      {/* TABLE */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Show</span>

            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="border rounded-md px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span className="text-sm text-gray-600">entries</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Total : <b>{filteredData.length}</b>
            </span>

            <input
              type="text"
              placeholder="Search invoice / party / GSTIN"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[520px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-white sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-center">Date</th>
                <th className="p-3 text-left">Party</th>
                <th className="p-3 text-center">GSTIN</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-gray-400">
                    Loading data...
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{row.invoice_no}</td>

                    <td className="p-3 text-center">
                      {new Date(row.voucher_date).toLocaleDateString("en-IN")}
                    </td>

                    <td className="p-3">{row.company_name}</td>

                    <td className="p-3 text-center">{row.gst_number}</td>

                    <td className="p-3 text-right text-blue-600">
                      ₹{Number(row.taxable_value).toLocaleString("en-IN")}
                    </td>

                    <td className="p-3 text-right text-green-600">
                      ₹{Number(row.gst_amount).toLocaleString("en-IN")}
                    </td>

                    <td className="p-3 text-right font-semibold text-gray-800">
                      ₹{Number(row.invoice_value).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Page <b>{currentPage}</b> of <b>{totalPages}</b>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-40 hover:bg-gray-100"
            >
              Previous
            </button>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1 border rounded-md text-sm disabled:opacity-40 hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
