import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getBankReport, getBanks } from "../../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ChevronDown } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";

export default function BankReport() {
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;
  const today = new Date();
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState([]);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [cardBank, setCardBank] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [openingBalanceState, setOpeningBalanceState] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    const fetchBanks = async () => {
      try {
        const res = await getBanks(companyId);

        // API response check karo
        const bankData = res.data?.data || res.data || [];
        setBanks(bankData);

        if (bankData.length > 0) {
          setCardBank(bankData[0].id);
        }
      } catch (err) {
        console.error("Bank fetch failed", err);
      }
    };

    fetchBanks();
  }, [companyId]);
  /* ================= FETCH REPORT ================= */
  const fetchReport = async () => {
    try {
      setLoading(true);

      console.log("Selected Bank:", selectedBank);

      const res = await getBankReport({
        fromDate: fromDate?.toISOString().split("T")[0],
        toDate: toDate?.toISOString().split("T")[0],
        bank_id: selectedBank || "",
      });

      console.log("Report Response:", res.data);
      setOpeningBalanceState(res.data.openingBalance || 0);
      setData(res.data.data || []);
      // setCurrentPage(1);
    } catch (err) {
      console.error("Bank Report error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  /* ================= TOTALS ================= */
  const filteredData = data.filter((d) => d.type !== "OPENING");

  const totalCredit = filteredData
    .filter((d) => d.flow === "IN" || d.flow === "Credit")
    .reduce((a, b) => a + Number(b.amount), 0);

    
  const totalDebit = filteredData
    .filter((d) => d.flow === "OUT" || d.flow === "Debit")
    .reduce((a, b) => a + Number(b.amount), 0);

  const closingBalance = Number(openingBalanceState) + totalCredit - totalDebit;

  /* ================= CARD FILTER DATA ================= */
  const selectedCardBankData = useMemo(() => {
    return banks.find(
      (b) => String(b.id) === String(cardBank)
    );
  }, [banks, cardBank]);

  const selectedCardBankName =
    selectedCardBankData?.bank_name || "";

  const cardFilteredData = useMemo(() => {
    if (!selectedCardBankName) return [];

    return filteredData.filter(
      (item) =>
        item.bank_name?.toLowerCase() ===
        selectedCardBankName.toLowerCase()
    );
  }, [filteredData, selectedCardBankName]);

  const cardOpeningBalance = useMemo(() => {
    const openingEntry = data.find(
      (item) =>
        item.type === "OPENING" &&
        item.bank_name?.toLowerCase() ===
        selectedCardBankName.toLowerCase()
    );

    return Number(openingEntry?.balance || 0);
  }, [data, selectedCardBankName]);

  const cardTotalCredit = useMemo(() => {
    return cardFilteredData
      .filter((d) => d.flow === "IN" || d.flow === "Credit")
      .reduce((a, b) => a + Number(b.amount || 0), 0);
  }, [cardFilteredData]);

  const cardTotalDebit = useMemo(() => {
    return cardFilteredData
      .filter((d) => d.flow === "OUT" || d.flow === "Debit")
      .reduce((a, b) => a + Number(b.amount || 0), 0);
  }, [cardFilteredData]);

  const cardClosingBalance =
    cardOpeningBalance + cardTotalCredit - cardTotalDebit;
  
  
  


  /* ================= EXPORT EXCEL ================= */
  const exportToExcel = () => {
    const formattedData = data.map((item, index) => ({
      "#": index + 1,
      Date: new Date(item.date).toLocaleDateString("en-GB"),
      Type: item.type,
      Voucher: item.voucher_no,
      Party: item.party_name || "-",
      Bank: item.bank_name || "-",
      Amount: item.amount,
      "Dr/Cr": item.flow === "IN" ? "Credit" : "Debit",

      Balance: item.balance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(file, `Bank_Report_${today.toLocaleDateString("en-GB")}.xlsx`);
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

  /* ================= EXPORT PDF ================= */
  const exportToPDF = async () => {
    if (!data || data.length === 0) {
      showError("No Bank Book data");
      return;
    }

    const company = JSON.parse(localStorage.getItem("company_data")) || {};
    const doc = new jsPDF("l", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const todayStr = new Date().toLocaleDateString("en-GB");

    const API_BASE = import.meta.env.VITE_SERVER_URL;

    const logoUrl = company.logo ? `${API_BASE}/${company.logo}` : null;
    const base64Logo = await loadImageAsBase64(logoUrl);

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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(
      (company.name || "").toUpperCase(),
      pageWidth / 2,
      headerCenterY - 3,
      { align: "center" },
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

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
    doc.line(14, dividerY, pageWidth - 14, dividerY);
    y = dividerY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("BANK BOOK REPORT", pageWidth / 2, y, { align: "center" });

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

    doc.text(`Date : ${todayStr}`, pageWidth - 14, y, {
      align: "right",
    });

    y += 6;

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
        item.bank_name || "-", // ✅ Bank column added
        Number(item.amount).toFixed(2),
        item.flow === "IN" ? "Credit" : "Debit",
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
          "Bank", // ✅ Added
          "Amount",
          "Dr/Cr",
          "Balance",
        ],
      ],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [45, 55, 72],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        6: { halign: "right" },
        7: { halign: "center" },
        8: { halign: "right" },
      },
    });

    /* ================= SUMMARY BOX ================= */

    const finalY = doc.lastAutoTable.finalY + 10;
    // const closingBalance = openingBalanceState + totalDebit - totalCredit;

    const closingBalance = data.length > 0 ? data[data.length - 1].balance : 0;

    const boxWidth = 85;
    const boxHeight = 24;
    const boxX = pageWidth - boxWidth - 14;
    const boxY = finalY;

    doc.rect(boxX, boxY, boxWidth, boxHeight);

    doc.setFontSize(9);
    doc.text("Total Debit :", boxX + 5, boxY + 7);
    doc.text(totalDebit.toFixed(2), boxX + boxWidth - 5, boxY + 7, {
      align: "right",
    });

    doc.text("Total Credit :", boxX + 5, boxY + 14);
    doc.text(totalCredit.toFixed(2), boxX + boxWidth - 5, boxY + 14, {
      align: "right",
    });

    doc.text("Closing Balance :", boxX + 5, boxY + 21);
    doc.text(closingBalance.toFixed(2), boxX + boxWidth - 5, boxY + 21, {
      align: "right",
    });

    /* ================= FOOTER ================= */

    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(company.name || "", 14, pageHeight - 8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
        align: "right",
      });
    }

    doc.save(`Bank_Book_${todayStr.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Bank Book </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor all debit and credit bank transactions
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <SummaryCard
          title="Opening Balance"
          value={openingBalanceState}
          icon={<Wallet size={20} />}
          type="info"
        />

        <SummaryCard
          title="Closing Balance"
          value={closingBalance}
          icon={<Wallet size={20} />}
          type="danger"
        />

        <SummaryCard
          title="Total Debit"
          value={totalDebit}
          icon={<ArrowDownCircle size={20} />}
          type="success"
        />

        <SummaryCard
          title="Total Credit"
          value={totalCredit}
          icon={<ArrowUpCircle size={20} />}
          type="danger"
        />
      </div>

      <div className="bg-white rounded-2xl shadow border">
        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  From Date
                </label>
                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="h-[40px] w-[150px] border border-gray-300 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  To Date
                </label>
                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="h-[40px] w-[150px] border border-gray-300 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bank</label>


                
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="h-[40px] w-[180px] border border-gray-300 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">All Banks</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* APPLY BUTTON */}
              <button
                onClick={fetchReport}
                className="h-[40px] px-5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Apply
              </button>
            </div>

            {/* RIGHT SIDE BUTTONS */}
            <div className="relative">
              {/* MAIN BUTTON */}
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-[40px] px-5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition flex items-center gap-2"
              >
                Export
                <ChevronDown size={16} />
              </button>

              {/* DROPDOWN */}
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-[140px] bg-white border rounded-xl shadow-lg z-50">
                  <button
                    onClick={() => {
                      exportToPDF();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-t-xl"
                  >
                    Export PDF
                  </button>

                  <button
                    onClick={() => {
                      exportToExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-b-xl"
                  >
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedBank && (
          <div className="bg-blue-50 border-l-4 border-blue-600 px-6 py-3 mb-4 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Opening Balance
              </span>
              <span className="text-lg font-bold text-blue-700">
                ₹{" "}
                {Number(openingBalanceState).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="text-gray-600 text-xs uppercase tracking-wide">
                <th className="p-3 text-left w-[50px]">Sr No.</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Voucher</th>
                <th className="p-3 text-left">Party</th>
                <th className="p-3 text-left">Bank</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Dr/Cr</th>
                <th className="p-3 text-right">Balance</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center p-10 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center p-10 text-gray-400">
                    No Bank Transactions Found
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={index}
                    className={`border-b ${item.type === "OPENING"
                      ? "bg-blue-100 font-bold text-blue-800"
                      : "hover:bg-gray-50"
                      }`}
                  >
                    <td className="p-3">{index + 1}</td>

                    <td className="p-3">
                      {new Date(item.date).toLocaleDateString("en-GB")}
                    </td>

                    <td className="p-3 font-medium">{item.type}</td>

                    <td className="p-3">{item.voucher_no}</td>

                    <td className="p-3 text-gray-700">
                      {item.party_name || "-"}
                    </td>

                    <td className="p-3 text-gray-700">
                      {item.bank_name || "-"}
                    </td>

                    <td className="p-3 text-right font-semibold">
                      {Number(item.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td
                      className={`p-3 text-center font-semibold ${item.flow === "IN" ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {item.flow === "IN" ? "Credit" : "Debit"}
                    </td>

                    <td
                      className={`p-3 text-right font-bold ${item.balance >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      ₹ {Number(item.balance).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selectedBank && (
          <div className="bg-green-50 border-t-2 border-green-600 px-6 py-4 mt-4 rounded">
            <div className="flex justify-between items-center">
              <span className="text-md font-semibold text-gray-700">
                Closing Balance
              </span>
              <span className="text-xl font-bold text-green-700">
                ₹{" "}
                {Number(closingBalance).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, type }) {
  const styles = {
    primary: "bg-white border border-gray-200",
    success: "bg-white border border-green-200",
    danger: "bg-white border border-red-200",
    info: "bg-white border border-blue-200",
  };

  const iconBg = {
    primary: "bg-gray-100 text-gray-600",
    success: "bg-green-100 text-green-600",
    danger: "bg-red-100 text-red-600",
    info: "bg-blue-100 text-blue-600",
  };

  return (
    <div
      className={`rounded-2xl p-5 shadow-sm hover:shadow-md transition ${styles[type]}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            ₹ {Number(value).toLocaleString("en-IN")}
          </h2>
        </div>

        <div className={`p-3 rounded-xl ${iconBg[type]}`}>{icon}</div>
      </div>
    </div>
  );
}
