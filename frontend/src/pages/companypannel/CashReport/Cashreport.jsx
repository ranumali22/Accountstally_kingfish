import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
} from "lucide-react";
import { getCashReport } from "../../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext";
import { showError } from "../../../components/ui/alert/Alert";

export default function CashReport() {
  const today = new Date();
  // const { setLoading } = useContext(LoaderContext);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [showExport, setShowExport] = useState(false);

  const fetchCashReport = async () => {
    try {
      setLoading(true);

      const res = await getCashReport({
        fromDate: fromDate?.toISOString().split("T")[0],
        toDate: toDate?.toISOString().split("T")[0],
      });

      setData(res.data.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Cash Report error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashReport();
  }, []);

  /* ================= TOTALS ================= */
  const totalDebit = data
    .filter((d) => d.flow === "IN")
    .reduce((a, b) => a + Number(b.amount), 0);

  const totalCredit = data
    .filter((d) => d.flow === "OUT")
    .reduce((a, b) => a + Number(b.amount), 0);

  const closingBalance = data.length ? data[data.length - 1].balance : 0;

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  const exportToExcel = () => {
    const formattedData = data.map((item, index) => ({
      "#": index + 1,
      Date: new Date(item.date).toLocaleDateString("en-GB"),
      Type: item.type,
      Voucher: item.voucher_no,
      Amount: item.amount,
      Flow: item.flow === "IN" ? "Debit" : "Credit",
      Balance: item.balance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(file, "Cash_Report.xlsx");
  };

  // ================= IMAGE HELPER =================
  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };

      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const exportToPDF = async () => {
    if (!data || data.length === 0) {
      showError("No Cash Book data");
      return;
    }

    const company = JSON.parse(localStorage.getItem("company_data")) || {};
    const doc = new jsPDF("l", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleDateString("en-GB");

    const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";

    const logoUrl = company.logo ? `${API_BASE}/${company.logo}` : null;
    const base64Logo = await loadImageAsBase64(logoUrl);

    /* ================= HEADER WITH PERFECT LOGO ================= */

    let y = 16;
    let logoHeight = 0;

    if (base64Logo) {
      const img = new Image();
      img.src = base64Logo;
      await new Promise((resolve) => (img.onload = resolve));

      const maxWidth = 45;
      const maxHeight = 22;

      let logoWidth = maxWidth;
      logoHeight = (img.height / img.width) * logoWidth;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = (img.width / img.height) * logoHeight;
      }

      doc.addImage(base64Logo, "PNG", 14, 10, logoWidth, logoHeight);
    }

    const headerCenterY = logoHeight > 0 ? 10 + logoHeight / 2 : y;

    /* ================= COMPANY NAME ================= */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30);

    doc.text(
      (company.name || "").toUpperCase(),
      pageWidth / 2,
      headerCenterY - 3,
      { align: "center" },
    );

    /* ================= COMPANY INFO ================= */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80);

    const infoLine = [
      [company.city, company.state, company.pincode].filter(Boolean).join(" "),
      company.mobile && `Mob: ${company.mobile}`,
      company.gst_number && `GSTIN: ${company.gst_number}`,
    ]
      .filter(Boolean)
      .join("   |   ");

    if (infoLine) {
      doc.text(infoLine, pageWidth / 2, headerCenterY + 3, {
        align: "center",
      });
    }

    if (company.address) {
      doc.setFontSize(8.5);
      doc.text(company.address, pageWidth / 2, headerCenterY + 8, {
        align: "center",
        maxWidth: pageWidth - 60,
      });
    }

    const dividerY = headerCenterY + 13;

    doc.setDrawColor(200);
    doc.line(14, dividerY, pageWidth - 14, dividerY);

    y = dividerY + 10;

    /* ================= REPORT TITLE ================= */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0);

    doc.text("CASH BOOK REPORT", pageWidth / 2, y, { align: "center" });

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text(
      `From : ${fromDate.toLocaleDateString(
        "en-GB",
      )}   To : ${toDate.toLocaleDateString("en-GB")}`,
      14,
      y,
    );

    doc.text(`Date : ${today}`, pageWidth - 14, y, { align: "right" });

    y += 6;

    /* ================= TABLE ================= */

    let totalDebit = 0;
    let totalCredit = 0;

    const tableData = data.map((item, index) => {
      if (item.flow === "IN") totalDebit += Number(item.amount);
      else totalCredit += Number(item.amount);

      return [
        index + 1,
        new Date(item.date).toLocaleDateString("en-GB"),
        item.type,
        item.voucher_no,
        item.party_name || "-",
        Number(item.amount).toFixed(2),
        item.flow === "IN" ? "Debit" : "Credit",
        Number(item.balance).toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [
        [
          "Sr",
          "Date",
          "Type",
          "Voucher",
          "Party",
          "Amount",
          "Dr/Cr",
          "Balance",
        ],
      ],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        lineColor: [230, 230, 230],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [45, 55, 72],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        5: { halign: "right" },
        6: { halign: "center" },
        7: { halign: "right" },
      },
    });

    /* ================= SUMMARY BOX ================= */

    const finalY = doc.lastAutoTable.finalY + 10;
    const closingBalance = totalDebit - totalCredit;

    const boxWidth = 80;
    const boxHeight = 24;
    const boxX = pageWidth - boxWidth - 14;
    const boxY = finalY;

    doc.setFillColor(245, 247, 250);
    doc.rect(boxX, boxY, boxWidth, boxHeight, "F");

    doc.setDrawColor(200);
    doc.rect(boxX, boxY, boxWidth, boxHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    // Total Debit
    doc.setTextColor(0);
    doc.text("Total Debit :", boxX + 5, boxY + 7);
    doc.setTextColor(200, 0, 0);
    doc.text(totalDebit.toFixed(2), boxX + boxWidth - 5, boxY + 7, {
      align: "right",
    });

    // Total Credit
    doc.setTextColor(0);
    doc.text("Total Credit :", boxX + 5, boxY + 14);
    doc.setTextColor(0, 140, 0);
    doc.text(totalCredit.toFixed(2), boxX + boxWidth - 5, boxY + 14, {
      align: "right",
    });

    // Closing Balance
    doc.setTextColor(0);
    doc.text("Closing Balance :", boxX + 5, boxY + 21);

    const closingText =
      Math.abs(closingBalance).toFixed(2) +
      (closingBalance < 0 ? " Dr" : " Cr");

    doc.text(closingText, boxX + boxWidth - 5, boxY + 21, {
      align: "right",
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

    doc.save(`Cash_Book_${today.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cash Book Report</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor all debit and credit cash transactions
          </p>
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          title="Closing Balance"
          value={closingBalance}
          icon={<Wallet size={20} />}
          color="blue"
        />
        <SummaryCard
          title="Total Debit"
          value={totalDebit}
          icon={<ArrowDownCircle size={20} />}
          color="green"
        />
        <SummaryCard
          title="Total Credit"
          value={totalCredit}
          icon={<ArrowUpCircle size={20} />}
          color="red"
        />
      </div>

      {/* ================= TABLE SECTION ================= */}
      <div className="bg-white rounded-2xl shadow border">
        {/* ===== FILTER + EXPORT BAR ===== */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-6 py-4 border-b bg-gray-50">
          {/* LEFT SIDE FILTERS */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* FROM DATE */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                From Date
              </label>
              <DatePicker
                selected={fromDate}
                onChange={(date) => setFromDate(date)}
                dateFormat="dd/MM/yyyy"
                className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[150px]"
              />
            </div>

            {/* TO DATE */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                To Date
              </label>
              <DatePicker
                selected={toDate}
                onChange={(date) => setToDate(date)}
                dateFormat="dd/MM/yyyy"
                className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-[150px]"
              />
            </div>

            {/* APPLY BUTTON */}
            <div className="flex flex-col justify-end">
              <label className="text-xs text-transparent mb-1 select-none">
                Action
              </label>
              <button
                onClick={fetchCashReport}
                className="h-[38px] bg-blue-600 text-white px-6 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
              >
                Apply Filter
              </button>
            </div>
          </div>

          {/* RIGHT SIDE CONTROLS */}
          <div className="flex items-center gap-3 relative">
            {/* ROWS PER PAGE */}
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-[38px] border border-gray-300 rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm appearance-none"
            >
              <option value={20}>20 / page</option>
              <option value={100}>100 / page</option>
              <option value={200}>200 / page</option>
              <option value={500}>500 / page</option>
            </select>

            {/* EXPORT BUTTON */}
            <div className="relative">
              <button
                onClick={() => setShowExport(!showExport)}
                className="h-[38px] flex items-center gap-2 bg-gray-800 text-white px-5 rounded-lg text-sm font-medium hover:bg-gray-900 transition shadow-sm"
              >
                Export
              </button>

              {showExport && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    onClick={() => {
                      exportToPDF();
                      setShowExport(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                  >
                    Export PDF
                  </button>

                  <button
                    onClick={() => {
                      exportToExcel();
                      setShowExport(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition"
                  >
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-gray-600 text-xs uppercase">
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">Date</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-left">Voucher</th>
                <th className="p-4 text-left">Party</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Dr / Cr</th>
                <th className="p-4 text-right">Balance</th>
              </tr>
            </thead>

            {/* <tbody>
              {paginatedData.map((item, index) => (
                <tr
                  key={index}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-4">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  <td className="p-4">
                    {new Date(item.date).toLocaleDateString("en-GB")}
                  </td>
                  <td className="p-4 font-medium">{item.type}</td>
                  <td className="p-4">{item.voucher_no}</td>
                  <td className="p-4 text-gray-700">
                    {item.party_name || "-"}
                  </td>
                  <td className="p-4 text-right font-semibold">
                    ₹ {Number(item.amount).toLocaleString()}
                  </td>
                  <td
                    className={`p-4 text-center font-semibold ${
                      item.flow === "IN" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {item.flow === "IN" ? "Debit" : "Credit"}
                  </td>
                  <td className="p-4 text-right font-bold text-blue-600">
                    ₹ {Number(item.balance).toLocaleString()}
                  </td>
                </tr>
              ))}

              {data.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center p-10 text-gray-400">
                    No Cash Transactions Found
                  </td>
                </tr>
              )}
            </tbody> */}

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center p-10 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-10 text-gray-400">
                    No Cash Transactions Found
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="p-4">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="p-4">
                      {new Date(item.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-4 font-medium">{item.type}</td>
                    <td className="p-4">{item.voucher_no}</td>
                    <td className="p-4 text-gray-700">
                      {item.party_name || "-"}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      ₹ {Number(item.amount).toLocaleString()}
                    </td>
                    <td
                      className={`p-4 text-center font-semibold ${
                        item.flow === "IN" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {item.flow === "IN" ? "Debit" : "Credit"}
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600">
                      ₹ {Number(item.balance).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===== PAGINATION ===== */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 text-sm">
          <span>
            Page {currentPage} of {totalPages || 1}
          </span>

          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-2 border rounded-xl hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-2 border rounded-xl hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SUMMARY CARD ================= */
function SummaryCard({ title, value, icon, color }) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white border rounded-xl px-6 py-5 flex items-center justify-between shadow hover:shadow-md transition">
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <h2 className="text-xl font-semibold mt-1">
          ₹ {Number(value).toLocaleString()}
        </h2>
      </div>
      <div className={`p-3 rounded-xl ${styles[color]}`}>{icon}</div>
    </div>
  );
}
