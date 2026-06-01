import React, { useState, useEffect, useMemo } from "react";
import { getGSTR3B } from "../../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

export default function GSTR3B() {
  // ================= DEFAULT DATES =================

  const today = new Date();

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const lastDay = today.toISOString().split("T")[0];

  const yearStart = new Date(today.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];

  // ================= STATES =================

  const [from, setFrom] = useState(new Date());
  const [to, setTo] = useState(new Date());

  const [data, setData] = useState(null);
const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);

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

      const res = await getGSTR3B({
        from: toLocalYYYYMMDD(from),
        to: toLocalYYYYMMDD(to),
      });
      setData(res.data.data);
    } catch (error) {
      showError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(firstDay, lastDay);
  }, []);

  // ================= VALUES =================

  const summary = useMemo(() => {
    return {
      outputGST: Number(data?.sales?.output_gst || 0),

      inputGST: Number(data?.purchase?.input_gst || 0),

      netGST: Number(data?.net_gst || 0),

      taxableSales: Number(data?.sales?.taxable_value || 0),

      taxablePurchase: Number(data?.purchase?.taxable_value || 0),
    };
  }, [data]);

  // ================= UI =================
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

  XLSX.utils.book_append_sheet(wb, ws, "GSTR3B");

  XLSX.writeFile(wb, "GSTR3B_Report.xlsx");
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

    doc.text("GSTR-3B SUMMARY REPORT", pageWidth / 2, y, { align: "center" });

    /* ================= SUMMARY DATA ================= */

    const tableData = [
      ["Output GST", summary.outputGST.toFixed(2)],
      ["Input GST", summary.inputGST.toFixed(2)],
      ["Net GST Payable", summary.netGST.toFixed(2)],
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

      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: "right" }
      );
    }

    doc.save(`GSTR3B_Report_${today.replace(/\//g, "-")}.pdf`);

  } catch (err) {

    console.error(err);

  }
};
  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">GSTR-3B Summary</h1>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-center">

  <div>
    <label className="text-xs text-gray-500">From</label>

    <DatePicker
      selected={from}
      onChange={(date)=>setFrom(date)}
      dateFormat="dd-MM-yyyy"
      className="border px-3 py-2 rounded text-sm w-36"
    />
  </div>

  <div>
    <label className="text-xs text-gray-500">To</label>

    <DatePicker
      selected={to}
      onChange={(date)=>setTo(date)}
      dateFormat="dd-MM-yyyy"
      className="border px-3 py-2 rounded text-sm w-36"
    />
  </div>

  <button
    onClick={()=>fetchReport()}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
  >
    Search
  </button>

  {/* QUICK BUTTONS */}

  <button
    onClick={()=>{
      const now=new Date();
      const first=new Date(now.getFullYear(),now.getMonth(),1);

      setFrom(first);
      setTo(now);
      fetchReport(first,now);
    }}
    className="border px-3 py-2 rounded text-sm"
  >
    This Month
  </button>

  <button
    onClick={()=>{
      const now=new Date();
      const first=new Date(now.getFullYear(),0,1);

      setFrom(first);
      setTo(now);
      fetchReport(first,now);
    }}
    className="border px-3 py-2 rounded text-sm"
  >
    This Year
  </button>


  {/* EXPORT */}

  <div className="relative ml-auto">

    <button
      onClick={()=>setShowExportMenu(!showExportMenu)}
      className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
    >
      Export
      <ChevronDown size={16}/>
    </button>

    {showExportMenu && (

      <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow">

        <button
          onClick={exportPDF}
          className="w-full text-left px-4 py-2 hover:bg-red-50 flex gap-2 items-center"
        >
          <FileText size={16} className="text-red-600"/>
          Export PDF
        </button>

        <button
          onClick={exportExcel}
          className="w-full text-left px-4 py-2 hover:bg-green-50 flex gap-2 items-center"
        >
          <FileSpreadsheet size={16} className="text-green-600"/>
          Export Excel
        </button>

      </div>

    )}

  </div>

</div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white shadow rounded-lg p-10 text-center">
          Loading GST summary...
        </div>
      )}

      {/* SUMMARY CARDS */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Output GST */}
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-gray-600 text-sm">Output GST</p>

            <h2 className="text-xl font-bold text-blue-600">
              ₹{summary.outputGST.toLocaleString("en-IN")}
            </h2>
          </div>

          {/* Input GST */}
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-gray-600 text-sm">Input GST</p>

            <h2 className="text-xl font-bold text-green-600">
              ₹{summary.inputGST.toLocaleString("en-IN")}
            </h2>
          </div>

          {/* Net GST */}
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-gray-600 text-sm">Net GST Payable</p>

            <h2
              className={`text-xl font-bold ${
                summary.netGST >= 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              ₹{summary.netGST.toLocaleString("en-IN")}
            </h2>
          </div>

          {/* Taxable Sales */}
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-gray-600 text-sm">Taxable Sales</p>

            <h2 className="text-xl font-bold text-purple-600">
              ₹{summary.taxableSales.toLocaleString("en-IN")}
            </h2>
          </div>

          {/* Taxable Purchase */}
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-gray-600 text-sm">Taxable Purchase</p>

            <h2 className="text-xl font-bold text-orange-600">
              ₹{summary.taxablePurchase.toLocaleString("en-IN")}
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
