import React, { useState, useEffect, useMemo } from "react";
import { getGSTR9 } from "../../../api";
import { FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
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

export default function GSTR9() {
  // ================= DATE / FY LOGIC =================

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const currentFY =
    currentMonth >= 4
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;

  const lastFY =
    currentMonth >= 4
      ? `${currentYear - 1}-${currentYear}`
      : `${currentYear - 2}-${currentYear - 1}`;

  const getStartYear = (fy) => parseInt(fy.split("-")[0]);

  // ================= STATES =================

  const [financialYear, setFinancialYear] = useState(currentFY);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ================= FETCH REPORT =================

  const fetchReport = async (fy = financialYear) => {
    try {
      setLoading(true);

      const startYear = getStartYear(fy);

      const res = await getGSTR9({
        year: startYear,
      });

      setData(res.data.data);
    } catch (error) {
      console.error(error);
      showError("Failed to load GSTR-9");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(currentFY);
  }, []);

  // ================= SUMMARY =================

  const summary = useMemo(() => {
    return {
      outputGST: Number(data?.sales?.output_gst || 0),
      inputGST: Number(data?.purchase?.input_gst || 0),
      netGST: Number(data?.net_gst || 0),
      taxableSales: Number(data?.sales?.taxable_value || 0),
      taxablePurchase: Number(data?.purchase?.taxable_value || 0),
    };
  }, [data]);

  // ================= EXPORT EXCEL =================

  const exportExcel = () => {
    const rows = [
      {
        OutputGST: summary.outputGST,
        InputGST: summary.inputGST,
        NetGST: summary.netGST,
        TaxableSales: summary.taxableSales,
        TaxablePurchase: summary.taxablePurchase,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "GSTR9");
    XLSX.writeFile(wb, "GSTR9_Report.xlsx");
  };

  // ================= EXPORT PDF =================
  const exportPDF = async () => {
    try {
      const company = JSON.parse(localStorage.getItem("company_data")) || {};

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

      doc.text("GSTR-9 ANNUAL REPORT", pageWidth / 2, y, { align: "center" });

      /* ================= SUMMARY ================= */

      const tableData = [
        ["Output GST", summary.outputGST.toFixed(2)],
        ["Input GST", summary.inputGST.toFixed(2)],
        ["Net GST Liability", summary.netGST.toFixed(2)],
        ["Taxable Sales", summary.taxableSales.toFixed(2)],
        ["Taxable Purchase", summary.taxablePurchase.toFixed(2)],
      ];

      y += 8;

      doc.setFontSize(9);

      doc.text(`Date : ${today}`, 14, y);

      /* ================= TABLE ================= */

      autoTable(doc, {
        startY: y + 6,

        margin: { left: 14, right: 14 },

        head: [["Description", "Amount"]],

        body: tableData,

        theme: "grid",

        styles: {
          fontSize: 10,
          cellPadding: 4,
        },

        headStyles: {
          fillColor: [55, 65, 81],
          textColor: 255,
        },

        columnStyles: {
          1: { halign: "right" },
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

      doc.save(`GSTR9_Report_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= UI =================

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            GSTR-9 Annual Report
          </h1>

          <p className="text-sm text-gray-500">
            Annual GST summary based on your sales and purchase transactions
          </p>
        </div>
      </div>

      {/* FILTER BAR */}

      <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Financial Year</label>

          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="border px-3 py-2 rounded-lg text-sm w-40 focus:ring-2 focus:ring-blue-500"
          >
            <option value={currentFY}>{currentFY}</option>
            <option value={lastFY}>{lastFY}</option>
          </select>
        </div>

        <button
          onClick={() => fetchReport()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Search
        </button>

        <button
          onClick={() => {
            setFinancialYear(currentFY);
            fetchReport(currentFY);
          }}
          className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Current FY
        </button>

        <button
          onClick={() => {
            setFinancialYear(lastFY);
            fetchReport(lastFY);
          }}
          className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Last FY
        </button>

        {/* EXPORT */}

        <div className="relative ml-auto">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            Export
            <ChevronDown size={16} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={exportPDF}
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2"
              >
                <FileText size={16} className="text-red-600" />
                Export PDF
              </button>

              <button
                onClick={exportExcel}
                className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 flex items-center gap-2"
              >
                <FileSpreadsheet size={16} className="text-green-600" />
                Export Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LOADING */}

      {loading && (
        <div className="bg-white shadow rounded-lg p-10 text-center text-gray-500">
          Loading annual GST report...
        </div>
      )}

      {/* SUMMARY CARDS */}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-medium">Output GST</p>
            <h2 className="text-xl font-bold text-blue-700 mt-1">
              ₹{summary.outputGST.toLocaleString("en-IN")}
            </h2>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-green-600 font-medium">Input GST</p>
            <h2 className="text-xl font-bold text-green-700 mt-1">
              ₹{summary.inputGST.toLocaleString("en-IN")}
            </h2>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-600 font-medium">
              Net GST Liability
            </p>
            <h2 className="text-xl font-bold text-red-700 mt-1">
              ₹{summary.netGST.toLocaleString("en-IN")}
            </h2>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs text-purple-600 font-medium">Taxable Sales</p>
            <h2 className="text-xl font-bold text-purple-700 mt-1">
              ₹{summary.taxableSales.toLocaleString("en-IN")}
            </h2>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs text-orange-600 font-medium">
              Taxable Purchase
            </p>
            <h2 className="text-xl font-bold text-orange-700 mt-1">
              ₹{summary.taxablePurchase.toLocaleString("en-IN")}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
