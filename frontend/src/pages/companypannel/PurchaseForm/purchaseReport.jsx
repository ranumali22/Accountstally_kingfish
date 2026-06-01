import { useMemo, useState, useEffect } from "react";
import { Eye, Pencil, Printer, Trash2, Search, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { getPurchaseReport, downloadPurchaseDoc } from "../../../api";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { showError } from "../../../components/ui/alert/Alert";

export default function PurchageBill() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);

  const [search, setSearch] = useState("");
  const today = new Date();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [showView, setShowView] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [parties, setParties] = useState([]);
  const [partySuggestions, setPartySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const money = (v) => Number(v || 0);

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  const formatDateYYYYMMDD = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date)) return "";

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`; // ✅ Local YYYY-MM-DD
  };

  const formatDateDDMMYYYY = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date)) return "-";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };
  const fetchBills = async (useDateFilter = false, partyIdOverride = null) => {
    if (!companyId) return;

    try {
      const params = {
        company_id: companyId,
      };

      /* ✅ SEND BOTH DATES */
      if (useDateFilter) {
        if (fromDate) {
          params.fromDate = formatDateYYYYMMDD(fromDate);
        }

        if (toDate) {
          params.toDate = formatDateYYYYMMDD(toDate);
        }
      }

      /* ✅ PARTY FILTER */
      if (partyIdOverride !== null) {
        params.party_id = partyIdOverride;
      } else if (selectedParty) {
        params.party_id = selectedParty;
      }

      /* ✅ SEARCH FILTER */
      if (search?.trim()) {
        params.search = search.trim();
      }

      const res = await getPurchaseReport(params);

      setBills(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setBills([]);
    }
  };

  const normalizedBills = useMemo(() => {
    return (bills || []).map((b) => {
      const total = money(b.total_amount ?? 0);
      const paid = money(b.paid_amount ?? 0);
      const due = money(b.due_amount || Math.max(total - paid, 0));

      return {
        id: b.bill_id,
        party_id: b.party_id,
        date: (b.voucher_date || "").slice(0, 10),
        invoiceNo: b.supplier_invoice_no || b.invoice_no || "-",
        party: b.party_name || "-",
        mode: b.mode || "ITEM",
        total,
        paid,
        due,

        rows:
          Array.isArray(b.rows) && b.rows.length > 0
            ? b.rows
            : Array.isArray(b.items)
              ? b.items
              : [],

        document: b.document || null,

        party_gstin: b.party_gstin || "",
        party_mobile: b.party_mobile || "",
        party_address: b.party_address || "",
        party_state: b.party_state || "",
        party_city: b.party_city || "",
        party_pincode: b.party_pincode || "",

        narration: b.narration || "",
        paymentType: b.payment_type || b.paymentType || "Cash",
      };
    });
  }, [bills]);

  useEffect(() => {
    const uniqueParties = [];

    normalizedBills.forEach((b) => {
      if (b.party && !uniqueParties.find((p) => p.company_name === b.party)) {
        uniqueParties.push({
          id: b.party_id,
          company_name: b.party,
        });
      }
    });

    setParties(uniqueParties);
  }, [normalizedBills]);

  useEffect(() => {
    fetchBills(true);
  }, [companyId, selectedParty]);

  const handleDateSearch = () => {
    if (!fromDate || !toDate) {
      showError("Please select both dates");
      return;
    }

    fetchBills(true);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);

    setSelectedParty("");

    if (!value.trim()) {
      setPartySuggestions([]);
      setShowSuggestions(false);
      setSelectedParty("");

      fetchBills(true);

      return;
    }

    const filtered = parties.filter((p) =>
      String(p.company_name || "")
        .toLowerCase()
        .includes(value.toLowerCase()),
    );

    setPartySuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (party) => {
    setSearch(party.company_name);

    setSelectedParty(party.id);

    setShowSuggestions(false);

    setCurrentPage(1);
  };

  useEffect(() => {
    const close = () => setShowSuggestions(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const filteredBills = normalizedBills;

  const totalRows = filteredBills.length;

  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;

  const startIndex = (currentPage - 1) * rowsPerPage;

  const endIndex = startIndex + rowsPerPage;

  const currentRows = filteredBills.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  const totalAmount = filteredBills.reduce((sum, b) => sum + money(b.total), 0);
  const totalPaid = filteredBills.reduce((sum, b) => sum + money(b.paid), 0);
  const totalDue = filteredBills.reduce((sum, b) => sum + money(b.due), 0);

  const openView = (bill) => {
    setViewBill({
      ...bill,
      rows: bill.rows || bill.items || [], // ✅ FIX
    });
    setShowView(true);
  };


  const downloadBill = (invoiceNo, documentPath) => {
    if (!documentPath) {
      showError("No document found");
      return;
    }

    let fileUrl = documentPath;

    if (!documentPath.startsWith("http")) {
      fileUrl = `${import.meta.env.VITE_SERVER_URL}/${documentPath}`;
    }

    const a = document.createElement("a");
    a.href = fileUrl;

    // ✅ ORIGINAL NAME (IMPORTANT)
    a.download = documentPath.split("/").pop();

    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const printBill = (bill) => {
    const rows = bill.rows || bill.items || [];

    const rowsHtml = rows.length
      ? `
      <table>
        <thead>
          <tr>
            <th style="text-align:left;">Item/Service</th>
            <th style="text-align:center;">HSN</th>
            <th style="text-align:right;">Qty</th>
            <th style="text-align:center;">Unit</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Tax</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${r.item || r.item_name || ""}</td>
              <td style="text-align:center;">${r.hsn || "-"}</td>
              <td style="text-align:right;">${r.qty || "-"}</td>
              <td style="text-align:center;">${r.unit || r.unit_name || "-"}</td>
              <td style="text-align:right;">₹ ${money(
                r.pricePerUnit || r.price_per_unit,
              ).toFixed(2)}</td>
              <td style="text-align:right;">₹ ${money(
                r.taxAmount || r.tax_amount,
              ).toFixed(2)}</td>
              <td style="text-align:right;">₹ ${money(r.amount).toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `
      : `<p>No rows found</p>`;

    const html = `
      <html>
        <head>
          <title>Purchase Print</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            .box { border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
            h2 { margin: 0 0 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td, th { border: 1px solid #ddd; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>Purchase Bill</h2>
            <p><b>Date:</b> ${bill.date || "-"}</p>
            <p><b>Invoice No:</b> ${bill.invoiceNo || "-"}</p>
            <p><b>Party:</b> ${bill.party || "-"}</p>
            <p><b>Mode:</b> ${bill.mode || "-"}</p>
            ${rowsHtml}
            <h3 style="text-align:right;margin-top:15px;">
              Total: ₹ ${money(bill.total).toFixed(2)}
            </h3>
            <h4 style="text-align:right;margin-top:5px;">
              Paid: ₹ ${money(bill.paid).toFixed(2)} | Due: ₹ ${money(
                bill.due,
              ).toFixed(2)}
            </h4>
          </div>

          <script>
            window.print();
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(html);
    win.document.close();
  };

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      try {
        if (!url) return resolve(null);

        // already base64
        if (url.startsWith("data:")) {
          return resolve(url);
        }

        // fix relative path
        let fullUrl = url;

        if (!url.startsWith("http")) {
          fullUrl = `${import.meta.env.VITE_SERVER_URL}/${url}`;
        }

        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.onload = function () {
          const canvas = document.createElement("canvas");

          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext("2d");

          ctx.drawImage(img, 0, 0);

          const base64 = canvas.toDataURL("image/png");

          resolve(base64);
        };

        img.onerror = function () {
          console.warn("Logo failed to load");

          resolve(null);
        };

        img.src = fullUrl;
      } catch {
        resolve(null);
      }
    });
  };

  const exportPDF = async () => {
    try {
      const company = JSON.parse(localStorage.getItem("company_data")) || {};

      const params = {
        fromDate: formatDateYYYYMMDD(fromDate),
        toDate: formatDateYYYYMMDD(toDate),
      };

      // const res = await getPurchaseReport({
      //   company_id: companyId,
      //   ...params,
      // });

      const res = await getPurchaseReport({
        company_id: companyId,
        fromDate: formatDateYYYYMMDD(fromDate),
        toDate: formatDateYYYYMMDD(toDate),
        search: search?.trim() || undefined,
        party_id: selectedParty || undefined,
      });

      const rows = res.data?.data || [];

      /* ================= PDF INIT ================= */

      const doc = new jsPDF("p", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const today = new Date().toLocaleDateString("en-GB");

      let y = 12;

      /* =====================================================
       LOAD LOGO (AUTO SCALE — CLEAR)
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
       HEADER CENTER LINE ALIGNMENT
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
       CITY STATE PIN | MOBILE | GST
    ===================================================== */

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

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

      /* =====================================================
       ADDRESS (SEPARATE LINE)
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

      doc.text("PURCHASE REPORT", pageWidth / 2, y, { align: "center" });

      /* =====================================================
       SUMMARY CALCULATION
    ===================================================== */

      const total = rows.reduce(
        (sum, r) => sum + Number(r.total_amount || 0),
        0,
      );

      const paid = rows.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0);

      const due = rows.reduce((sum, r) => sum + Number(r.due_amount || 0), 0);

      /* =====================================================
       DATE + SUMMARY LINE
    ===================================================== */

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text(`Date : ${today}`, 14, y);

      doc.setFont("helvetica", "bold");

      doc.setTextColor(0);

      doc.text(`Total : Rs ${total.toFixed(2)}`, pageWidth / 2 - 30, y);

      doc.setTextColor(0, 140, 0);

      doc.text(`Paid : Rs ${paid.toFixed(2)}`, pageWidth / 2 + 20, y);

      doc.setTextColor(200, 0, 0);

      doc.text(`Due : Rs ${due.toFixed(2)}`, pageWidth - 14, y, {
        align: "right",
      });

      doc.setTextColor(0);

      /* =====================================================
       TABLE
    ===================================================== */

      y += 6;

      const tableData = rows.map((b, index) => [
        index + 1,

        // b.party,
        b.party_name,

        // b.supplier_invoice_no,
        b.invoice_no,

        formatDateDDMMYYYY(b.voucher_date),

        b.mode,

        Number(b.total_amount).toFixed(2),

        Number(b.paid_amount).toFixed(2),

        Number(b.due_amount).toFixed(2),
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

      doc.save(`Purchase_Report_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  const exportExcel = async () => {
    try {
      const params = {
        fromDate: formatDateYYYYMMDD(fromDate),
        toDate: formatDateYYYYMMDD(toDate),
      };

      // const res = await getPurchaseReport({
      //   company_id: companyId,
      //   ...params,
      // });

      const res = await getPurchaseReport({
        company_id: companyId,
        fromDate: formatDateYYYYMMDD(fromDate),
        toDate: formatDateYYYYMMDD(toDate),
        search: search?.trim() || undefined,
        party_id: selectedParty || undefined,
      });

      const rows = res.data?.data || [];

      const data = rows.map((b, index) => ({
        Sr: index + 1,
        Party: b.party_name,
        InvoiceNo: b.invoice_no,
        Date: formatDateDDMMYYYY(b.voucher_date),
        Mode: b.mode,
        Total: b.total_amount,
        Paid: b.paid_amount,
        Due: b.due_amount,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Report");

      XLSX.writeFile(
        workbook,
        `Purchase_Report_${new Date().toLocaleDateString()}.xlsx`,
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-white border-b px-5 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-800">
            Purchase Bill Report
          </div>
        </div>

        {/* Filters + Summary */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* PAID */}
            <div className="rounded-xl border bg-green-50 hover:bg-green-100 transition p-4 flex flex-col">
              <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                Paid Amount
              </span>

              <span className="mt-2 text-2xl font-bold text-green-800">
                ₹ {totalPaid.toFixed(2)}
              </span>

              <span className="text-xs text-green-600 mt-1">
                Completed payments
              </span>
            </div>

            {/* DUE */}
            <div className="rounded-xl border bg-blue-50 hover:bg-blue-100 transition p-4 flex flex-col">
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                Due Amount
              </span>

              <span className="mt-2 text-2xl font-bold text-blue-800">
                ₹ {totalDue.toFixed(2)}
              </span>

              <span className="text-xs text-blue-600 mt-1">
                Pending payments
              </span>
            </div>

            {/* TOTAL */}
            <div className="rounded-xl border bg-orange-50 hover:bg-orange-100 transition p-4 flex flex-col">
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                Total Amount
              </span>

              <span className="mt-2 text-2xl font-bold text-orange-800">
                ₹ {totalAmount.toFixed(2)}
              </span>

              <span className="text-xs text-orange-600 mt-1">
                Overall purchases
              </span>
            </div>
          </div>
        </div>
        {/* TABLE */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ">
              {/* RIGHT */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-[240px] z-[9999]">
                  <Search
                    size={20}
                    className="absolute left-3 top-[10px] text-gray-500"
                  />

                  <input
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => search && setShowSuggestions(true)}
                    placeholder="Search party..."
                    className="h-[36px] w-full border border-gray-300 rounded-md pl-10 pr-3 text-sm"
                  />

                  {/* Suggestions */}
                  {showSuggestions && partySuggestions.length > 0 && (
                    <div className="absolute top-[40px] left-0 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-[9999]">
                      {partySuggestions.map((party) => (
                        <div
                          key={party.id}
                          onMouseDown={() => handleSuggestionClick(party)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 border-b last:border-none"
                        >
                          {party.company_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 🔹 Date Row */}
              <div className="flex flex-wrap items-center gap-3">
                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  placeholderText="From date"
                  dateFormat="dd-MM-yyyy"
                  isClearable
                  className="h-10 border rounded-md px-3 text-sm w-[160px]"
                />

                <span className="text-sm text-gray-500 whitespace-nowrap">
                  To
                </span>

                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="To date"
                  isClearable
                  className="h-10 border rounded-md px-3 text-sm w-[160px]"
                />
              </div>

              {/* 🔹 Search Button Row */}
              <div>
                <button
                  type="button"
                  onClick={handleDateSearch}
                  className="h-10 px-6 rounded-md  bg-green-600 text-white font-semibold hover:opacity-90 w-full sm:w-auto"
                >
                  Search
                </button>
              </div>
            </div>
            <div className="relative">
              {/* MAIN BUTTON */}
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="
      h-10 px-5
      bg-indigo-600
      text-white
      rounded-lg
      text-sm font-semibold
      shadow-sm
      hover:bg-indigo-700
      flex items-center gap-2
    "
              >
                Export
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showExportMenu ? "rotate-180" : ""
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

              {/* DROPDOWN */}
              {showExportMenu && (
                <div
                  className="
    absolute right-0 mt-2 w-40
    bg-white border rounded-lg shadow-lg
    z-[9999]
    overflow-hidden
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
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              {/* LEFT */}
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, totalRows)} of{" "}
                {totalRows} entries
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page:</span>

                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#666] text-white">
                <tr>
                  <th className="p-3 text-center w-12 border border-white/20">
                    Sr
                  </th>
                  <th className="p-3 text-left min-w-[140px] border border-white/20">
                    Party
                  </th>
                  <th className="p-3 text-left w-[160px] border border-white/20">
                    Invoice No
                  </th>
                  <th className="p-3 text-left w-[140px] border border-white/20">
                    Date
                  </th>
                  <th className="p-3 text-left w-[120px] border border-white/20">
                    Mode
                  </th>
                  <th className="p-3 text-right w-[140px] border border-white/20">
                    Total
                  </th>
                  <th className="p-3 text-right w-[140px] border border-white/20">
                    Paid
                  </th>
                  <th className="p-3 text-right w-[140px] border border-white/20">
                    Due
                  </th>
                  <th className="p-3 text-center w-[180px]">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  currentRows.map((b, index) => (
                    <tr key={b.id} className="border hover:bg-gray-50">
                      <td className="p-3 text-center border">
                        {startIndex + index + 1}
                      </td>

                      <td className="p-3 border truncate max-w-[20px]">
                        {b.party}
                      </td>

                      <td className="p-3 font-medium border">{b.invoiceNo}</td>

                      <td className="p-3 border">
                        {formatDateDDMMYYYY(b.date)}
                      </td>

                      <td className="p-3 border">{b.mode}</td>

                      <td className="p-3 whitespace-nowrap border">
                        ₹ {money(b.total).toFixed(2)}
                      </td>

                      <td className="p-3 whitespace-nowrap border">
                        ₹ {money(b.paid).toFixed(2)}
                      </td>

                      <td className="p-3  whitespace-nowrap text-red-600 border">
                        ₹ {money(b.due).toFixed(2)}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                            title="View"
                            onClick={() => openView(b)}
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                            title="Download"
                            onClick={() =>
                              downloadBill(b.invoiceNo, b.document)
                            }
                          >
                            <Download size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                            title="Print"
                            onClick={() => printBill(b)}
                          >
                            <Printer size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t">
            {/* LEFT */}
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            {/* RIGHT */}
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

              {/* PAGE NUMBERS */}
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded ${
                    currentPage === i + 1
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
      </div>
      {/* VIEW MODAL */}
      {showView && viewBill && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center">
          {/* BACKDROP */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

          {/* MODAL */}
          <div
            className="
        relative
        bg-white
        rounded-xl
        shadow-2xl
        w-full max-w-[700px]
        max-h-[90vh]
        flex flex-col
        overflow-hidden
        z-[1000000]
      "
          >
            {/* ===== HEADER ===== */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Purchase Voucher</h2>
                <p className="text-xs opacity-80">
                  Voucher #{viewBill.invoiceNo} •{" "}
                  {formatDateDDMMYYYY(viewBill.date)}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowView(false);
                  setViewBill(null);
                }}
                className="text-white text-xl hover:opacity-80"
              >
                ×
              </button>
            </div>

            {/* ===== BODY ===== */}
            <div
              className="p-4 sm:p-6 bg-gray-50 
           grid grid-cols-1 md:grid-cols-12 
            gap-5 overflow-y-auto"
            >
              {/* LEFT COLUMN */}
              <div className="md:col-span-5 space-y-4">
                {/* PARTY DETAILS */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase">
                    Party Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <Detail label="Party Name" value={viewBill.party} />
                    <Detail label="GST No" value={viewBill.party_gstin} />
                    <Detail label="Mobile" value={viewBill.party_mobile} />
                    <Detail label="Pincode" value={viewBill.party_pincode} />
                    <Detail label="City" value={viewBill.party_city} />
                    <Detail label="State" value={viewBill.party_state} />
                    <div className="col-span-2">
                      <Detail label="Address" value={viewBill.party_address} />
                    </div>
                  </div>
                </div>

                {/* EXPENSE / PURCHASE INFO */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase">
                    Purchase Info
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Detail label="Mode" value={viewBill.mode} />
                    <Detail label="Payment Type" value={viewBill.paymentType} />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="md:col-span-7 space-y-4">
                {/* AMOUNT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AmountCard label="Total" value={viewBill.total} />
                  <AmountCard
                    label="Paid"
                    value={viewBill.paid}
                    type="success"
                  />
                  <AmountCard label="Due" value={viewBill.due} type="danger" />
                </div>

                {/* NARRATION */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                    Narration
                  </h3>
                  <p className="text-sm text-gray-700 min-h-[40px]">
                    {viewBill.narration || "—"}
                  </p>
                </div>

                {/* ITEMS TABLE */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase">
                    Items
                  </h3>

                  {viewBill.rows && viewBill.rows.length > 0 ? (
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 border">Item</th>
                          <th className="p-2 border">Qty</th>
                          <th className="p-2 border">Price</th>
                          <th className="p-2 border">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewBill.rows.map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 border">
                              {r.item || r.item_name}
                            </td>
                            <td className="p-2 border">{r.qty}</td>
                            <td className="p-2 border">₹ {r.price_per_unit}</td>
                            <td className="p-2 border">₹ {r.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-500">No items found</p>
                  )}
                </div>

                {/* ATTACHED BILL */}
                {viewBill.document && (
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase">
                        Attached Bill
                      </h3>

                      <div className="flex gap-2">
                        <a
                          href={getDocumentUrl(viewBill.document)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200"
                          title="View"
                        >
                          👁
                        </a>

                        <button
                          onClick={() =>
                            // downloadBill(viewBill.invoiceNo, viewBill.document)
                            downloadBill(
                              viewBill.supplier_invoice_no ||
                                viewBill.invoice_no,
                              viewBill.document,
                            )
                          }
                          className="h-9 w-9 flex items-center justify-center rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </div>

                    {!viewBill.document.endsWith(".pdf") ? (
                      <img
                        src={getDocumentUrl(viewBill.document)}
                        alt="Bill"
                        className="max-h-[200px] sm:max-h-[260px] 
                        w-full mx-auto border rounded-lg object-contain"
                      />
                    ) : (
                      <p className="text-sm text-gray-600">
                        PDF Document Attached
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ===== FOOTER ===== */}
            <div className="px-6 py-4 border-t bg-white flex justify-end">
              <button
                onClick={() => {
                  setShowView(false);
                  setViewBill(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm border rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const Detail = ({ label, value }) => (
  <div>
    <div className="text-xs text-gray-500">{label}</div>
    <div className="font-medium text-gray-800">{value || "—"}</div>
  </div>
);

const AmountCard = ({ label, value, type }) => {
  const colors =
    type === "success"
      ? "bg-green-100 text-green-700"
      : type === "danger"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-800";

  return (
    <div className={`rounded-lg p-4 text-center ${colors}`}>
      <div className="text-xs uppercase">{label}</div>
      <div className="text-lg font-bold">₹ {Number(value || 0).toFixed(2)}</div>
    </div>
  );
};

const getDocumentUrl = (path) => {
  if (!path) return "";
  return `${import.meta.env.VITE_SERVER_URL}/${path.replace(/\\/g, "/")}`;
};
