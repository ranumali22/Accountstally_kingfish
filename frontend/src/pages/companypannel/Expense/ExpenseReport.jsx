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
import { getExpenses, deleteExpense } from "../../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { IndianRupee } from "lucide-react";
import { FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";

const capitalizeFirst = (text) => {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function UnifiedReportPage({ title = "Expense" }) {
  const navigate = useNavigate();

  const toLocalYYYYMMDD = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const today = new Date();

  const firstDay = toLocalYYYYMMDD(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const lastDay = toLocalYYYYMMDD(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );

  const [rows, setRows] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [mode, setMode] = useState("list");
  const [viewRow, setViewRow] = useState(null);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [parties, setParties] = useState([]);
  const [partySuggestions, setPartySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  // list | add | edit | view

  const formatDate = (d) => {
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd} /${mm} /${yyyy}`;
  };

  const formatDateYYYYMMDD = (d) => {
    if (!d) return "";
    const date = new Date(d);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;
  };

  const formatDateDDMMYYYY = (d) => {
    if (!d) return "-";

    const date = new Date(d);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };
  /* ================= FETCH ================= */
  useEffect(() => {
    fetchExpenses();
  }, []);

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  useEffect(() => {
    if (!companyId) return;

    fetch(`/api/party?company_id=${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setParties(data);
        } else if (data) {
          setParties([data]);
        } else {
          setParties([]);
        }
      })
      .catch((err) => console.error(err));
  }, [companyId]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);

    if (!value.trim()) {
      setPartySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = parties.filter((p) =>
      (p.company_name || "").toLowerCase().includes(value.toLowerCase()),
    );

    setPartySuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (party) => {
    setSearch(party.company_name);

    setShowSuggestions(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, fromDate, toDate]);

  useEffect(() => {
    const close = () => setShowSuggestions(false);

    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, []);

  const fetchExpenses = async () => {
    console.log("fetchExpenses called"); // 👈 ye dikhe ya nahi?

    try {
      const res = await getExpenses();
      console.log("API RESPONSE:", res); // 👈 yahan aana chahiye

      const list = Array.isArray(res.data) ? res.data : [];
      console.log("LIST:", list);

      const mapped = list
        .filter((e) => Number(e.status) === 1)
        .map((e) => ({
          id: e.id,

          expense_group_id: e.expense_group_id,
          expense_group_name: e.expense_group_name,
          expense_master_id: e.expense_master_id,
          expense_type_id: e.expense_type_id,

          expense_head: e.expense_master,
          expense_type: e.expense_type,

          // party
          party_id: e.party_id,
          party_name: e.party_name || "-",
          party_gst: e.party_gst || "-",
          party_phone: e.party_phone || "",
          // party_address: e.address || "",
          party_address: e.party_address || "",
          document: e.document,

          // 🔥🔥 ADD THESE
          city: e.city,
          state: e.state,
          pincode: e.pincode,

          // amount
          amount: Number(e.amount),
          paid: Number(e.paid), // 🔥 FIXED
          due: Number(e.due), // 🔥 ADD THIS
          // date
          date: e.expense_date,
          narration: e.narration,
        }));

      console.log("MAPPED:", mapped);
      setRows(mapped);
    } catch (err) {
      console.error("Expense fetch failed", err);
      setRows([]);
    }
  };

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const rowDate = formatDateYYYYMMDD(r.date);

      if (fromDate && rowDate < formatDateYYYYMMDD(fromDate)) return false;

      if (toDate && rowDate > formatDateYYYYMMDD(toDate)) return false;

      if (search) {
        const s = search.toLowerCase();

        return (
          r.party_name?.toLowerCase().includes(s) ||
          r.expense_type?.toLowerCase().includes(s) ||
          r.expense_head?.toLowerCase().includes(s)
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
  const totalRows = filtered.length;

  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

  const startIndex = (currentPage - 1) * rowsPerPage;

  const endIndex = startIndex + rowsPerPage;

  const currentRows = filtered.slice(startIndex, endIndex);

  /* ================= ACTIONS ================= */

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

    loadSales();
  };

  /* =====================================================
   CONVERT IMAGE URL → BASE64 (FULL SAFE VERSION)
===================================================== */

  const exportPDF = async () => {
    const company = JSON.parse(localStorage.getItem("company_data")) || {};

    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const today = new Date().toLocaleDateString("en-GB");

    let y = 12;

    /* =====================================================
     LOAD LOGO (PROPER ASPECT RATIO + CLEAR)
  ===================================================== */

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

    /* =====================================================
     HEADER CENTER LINE (align with logo center)
  ===================================================== */

    const headerCenterY = logoHeight > 0 ? logoY + logoHeight / 2 : y;

    /* =====================================================
     COMPANY NAME
  ===================================================== */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(25, 25, 25);

    doc.text(
      (company.name || "COMPANY NAME").toUpperCase(),
      pageWidth / 2,
      headerCenterY - 2,
      { align: "center" },
    );

    /* =====================================================
     CITY STATE PIN | MOBILE | GST (ROW 1)
  ===================================================== */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const infoLine = [
      [company.city, company.state, company.pincode].filter(Boolean).join(" "),

      company.mobile ? `Mob: ${company.mobile}` : null,

      company.gst_number ? `GSTIN: ${company.gst_number}` : null,
    ]
      .filter(Boolean)
      .join("   |   ");

    if (infoLine) {
      doc.text(infoLine, pageWidth / 2, headerCenterY + 4, { align: "center" });
    }

    /* =====================================================
     ADDRESS (ROW 2 SEPARATE — NO OVERLAP)
  ===================================================== */

    if (company.address) {
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);

      doc.text(company.address, pageWidth / 2, headerCenterY + 9, {
        align: "center",
        maxWidth: pageWidth - 60,
      });
    }

    /* =====================================================
     DIVIDER LINE
  ===================================================== */

    doc.setDrawColor(180);
    doc.setLineWidth(0.4);

    doc.line(14, headerCenterY + 13, pageWidth - 14, headerCenterY + 13);

    /* =====================================================
     REPORT TITLE
  ===================================================== */

    y = headerCenterY + 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0);

    doc.text("EXPENSE REPORT", pageWidth / 2, y, { align: "center" });

    /* =====================================================
     DATE + SUMMARY LINE
  ===================================================== */

    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    doc.text(`Date : ${today}`, 14, y);

    doc.setFont("helvetica", "bold");

    doc.setTextColor(0);

    doc.text(`Total : Rs ${summary.total.toFixed(2)}`, pageWidth / 2 - 30, y);

    doc.setTextColor(0, 140, 0);

    doc.text(`Paid : Rs ${summary.paid.toFixed(2)}`, pageWidth / 2 + 20, y);

    doc.setTextColor(200, 0, 0);

    doc.text(`Due : Rs ${summary.unpaid.toFixed(2)}`, pageWidth - 14, y, {
      align: "right",
    });

    doc.setTextColor(0);

    /* =====================================================
     TABLE
  ===================================================== */

    y += 6;

    const tableData = filtered.map((r, index) => [
      index + 1,

      r.party_name,

      capitalizeFirst(r.expense_type),

      capitalizeFirst(r.expense_head),

      formatDateDDMMYYYY(r.date),

      r.amount.toFixed(2),

      r.paid.toFixed(2),

      r.due.toFixed(2),
    ]);

    autoTable(doc, {
      startY: y,

      margin: { left: 14, right: 14 },

      head: [
        ["Sr", "Party", "Invoice No", "Date", "Mode", "Total", "Paid", "Due"],
      ],

      body: tableData,

      theme: "grid",

      styles: {
        fontSize: 8.5,

        cellPadding: 3,

        lineColor: [220, 220, 220],

        lineWidth: 0.2,
        textColor: [0, 0, 0],
      },

      headStyles: {
        fillColor: [55, 65, 81], // ✅ DARK HEADER BACK

        textColor: 255, // ✅ WHITE TEXT

        fontStyle: "bold",

        fontSize: 9,

        halign: "center",
      },

      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },

      columnStyles: {
        0: { halign: "center", cellWidth: 8 },

        5: { halign: "right" },

        6: { halign: "right", textColor: [0, 140, 0] },

        7: { halign: "right", textColor: [200, 0, 0] },
      },
    });

    /* =====================================================
     FOOTER
  ===================================================== */

    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setFont("helvetica", "normal");

      doc.setFontSize(8);

      doc.setTextColor(140);

      doc.text(company.name || "", 14, pageHeight - 8);

      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
        align: "right",
      });
    }

    /* =====================================================
     SAVE FILE
  ===================================================== */

    doc.save(`Expense_Report_${today.replace(/\//g, "-")}.pdf`);
  };

  const exportExcel = () => {
    const data = filtered.map((r, index) => ({
      Sr: index + 1,
      Party: r.party_name,
      ExpenseType: r.expense_type,
      ExpenseHead: r.expense_head,
      Date: formatDateDDMMYYYY(r.date),
      Total: r.amount,
      Paid: r.paid,
      Due: r.due,
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Expense Report");

    XLSX.writeFile(wb, "Expense_Report.xlsx");
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {!showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-5">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              All Expense Report
            </h2>

            <div className="text-sm text-gray-500">
              Overview of your expenses
            </div>
          </div>

          {/* CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {/* PAID */}
            <SummaryCard
              title="Paid Amount"
              value={summary.paid}
              color="green"
              icon={<IndianRupee size={20} />}
              subtitle="Completed payments"
            />

            {/* UNPAID */}
            <SummaryCard
              title="Unpaid Amount"
              value={summary.unpaid}
              color="blue"
              icon={<IndianRupee size={20} />}
              subtitle="Pending payments"
            />

            {/* TOTAL */}
            <SummaryCard
              title="Total Amount"
              value={summary.total}
              color="yellow"
              icon={<IndianRupee size={20} />}
              subtitle="Overall expenses"
            />
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
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
            {/* LEFT SECTION */}
            <div className="flex items-center gap-3">
              {/* SEARCH */}
              <div className="relative w-[220px]">
                <Search
                  size={16}
                  className="absolute left-3 top-[10px] text-gray-400"
                />

                <input
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search party..."
                  className="h-10 w-full border rounded-lg pl-9 pr-3 text-sm"
                />

                {/* Suggestions */}
                {showSuggestions && partySuggestions.length > 0 && (
                  <div className="absolute top-[42px] left-0 w-full bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {partySuggestions.map((party) => (
                      <div
                        key={party.id}
                        onMouseDown={() => handleSuggestionClick(party)}
                        className="px-3 py-2 text-sm hover:bg-green-50 cursor-pointer border-b"
                      >
                        {party.company_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FROM DATE */}
              <DatePicker
                selected={fromDate}
                onChange={(date) => setFromDate(date)}
                placeholderText="From date"
                dateFormat="dd-MM-yyyy"
                isClearable
                className="
        h-10 w-[150px]
        border border-gray-300
        rounded-lg
        px-3
        text-sm
        focus:outline-none
        focus:ring-2 focus:ring-blue-200
      "
              />

              {/* TO TEXT */}
              <span className="text-gray-500 text-sm">To</span>

              {/* TO DATE */}
              <DatePicker
                selected={toDate}
                onChange={(date) => setToDate(date)}
                placeholderText="To date"
                dateFormat="dd-MM-yyyy"
                isClearable
                className="
        h-10 w-[150px]
        border border-gray-300
        rounded-lg
        px-3
        text-sm
        focus:outline-none
        focus:ring-2 focus:ring-blue-200
      "
              />

              {/* SEARCH BUTTON */}
              <button
                onClick={handleDateSearch}
                className="
        h-10 px-6
        bg-green-600
        text-white
        text-sm font-semibold
        rounded-lg
        hover:bg-green-700
        transition
      "
              >
                Search
              </button>
            </div>

            {/* RIGHT EXPORT BUTTON */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="
        h-10 px-6
        bg-indigo-600
        text-white
        text-sm font-semibold
        rounded-lg
        hover:bg-indigo-700
        flex items-center gap-2
      "
              >
                Export
                <svg
                  className={`w-4 h-4 transition-transform ${showExportMenu ? "rotate-180" : ""
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showExportMenu && (

                <div
                  className="
    absolute right-0 mt-2 w-44
    bg-white border rounded-lg shadow-md
    overflow-hidden z-50
  "
                >
                  {/* EXPORT PDF */}
                  <button
                    onClick={() => {
                      exportPDF();
                      setShowExportMenu(false);
                    }}
                    className="
      w-full text-left px-4 py-2 text-sm
      hover:bg-red-50 hover:text-red-600
      flex items-center gap-2
      transition-colors
    "
                  >
                    <FileText size={16} className="text-red-600" />
                    Export PDF
                  </button>

                  {/* EXPORT EXCEL */}
                  <button
                    onClick={() => {
                      exportExcel();
                      setShowExportMenu(false);
                    }}
                    className="
      w-full text-left px-4 py-2 text-sm
      hover:bg-green-50 hover:text-green-600
      flex items-center gap-2
      transition-colors
    "
                  >
                    <FileSpreadsheet size={16} className="text-green-600" />
                    Export Excel
                  </button>
                </div>
              )}
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
                  {/* <th className="p-2">GST</th> */}
                  <th className="p-2 text-right border">Paid</th>
                  <th className="p-2 text-right border">Due</th>
                  <th className="p-2 text-right border">Total</th>
                  <th className="p-2 text-center border">Action</th>
                </tr>
              </thead>

              <tbody>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  currentRows.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border hover:bg-gray-50 text-center"
                    >
                      <td className="p-4 text-center">{startIndex + i + 1}</td>
                      {/* <td className="p-4 border ">{r.expense_type}</td>
                      <td className="p-4 border">{r.expense_head}</td> */}
                      <td className="p-4 border ">
                        {capitalizeFirst(r.expense_type)}
                      </td>

                      <td className="p-4 border">
                        {capitalizeFirst(r.expense_head)}
                      </td>
                      <td className="p-4 border">{r.party_name}</td>
                      <td className="p-4 border">
                        {r.expense_group_name || "-"}
                      </td>

                      <td className="p-4">
                        {new Date(r.date).toLocaleDateString("en-GB")}
                      </td>

                      {/* <td className="p-4 text-center">
                      {r.party_gst ? r.party_gst : "—"}
                    </td> */}

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

                          {/* PRINT */}
                          <button
                            onClick={() => handlePrint(r)}
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            <Printer size={16} />
                          </button>

                          {/* DOWNLOAD (DISABLED) */}
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
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                First
              </button>

              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded ${currentPage === i + 1
                    ? "bg-green-600 text-white"
                    : "bg-white"
                    }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}
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
                  {new Date(data.date).toLocaleDateString("en-GB")}
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
                  <Detail
                    label="Expense Head"
                    value={capitalizeFirst(data.expense_head)}
                  />

                  <Detail
                    label="Expense Type"
                    value={capitalizeFirst(data.expense_type)}
                  />
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
  const cleanPath = path.replace(/\\/g, "/");
  return `${import.meta.env.VITE_SERVER_URL}/${cleanPath}`;
};

function SummaryCard({ title, value, color, subtitle, icon }) {
  const styles = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      iconBg: "bg-green-100",
      iconText: "text-green-600",
    },

    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    },

    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      iconBg: "bg-yellow-100",
      iconText: "text-yellow-600",
    },
  };

  const s = styles[color];

  return (
    <div
      className={`
      ${s.bg}
      ${s.border}
      border
      rounded-xl
      p-5
      flex
      items-center
      justify-between
      transition
      hover:shadow-md
      hover:scale-[1.02]
      cursor-default
    `}
    >
      {/* LEFT */}
      <div>
        <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>

        <div className={`text-2xl font-bold ${s.text}`}>
          ₹{" "}
          {Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </div>

        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
