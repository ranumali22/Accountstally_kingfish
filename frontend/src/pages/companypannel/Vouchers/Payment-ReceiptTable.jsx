import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Printer, Trash2, Download, Search } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext"; // path adjust
import {
  getVouchersByCompany,
  cancelVoucher,
  getVoucherById,
  getPartyWithDues, // 🔥 added
} from "../../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";
import { formatDate, toYYYYMMDD } from "../../../utils/dateUtils";

/* -------------------- Helpers -------------------- */

// Date helpers are now imported from central dateUtils.js
const money = (v) => Number(v || 0);

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
/* -------------------- Main Component -------------------- */

export default function VoucherList() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  // const { loading, setLoading } = useContext(LoaderContext);
  const [loading, setLocalLoading] = useState(false);
  const editIdFromUrl = params.get("id");
  const COMPANY_ID = JSON.parse(localStorage.getItem("company_data"))?.id;
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [partyBalances, setPartyBalances] = useState([]); // 🔥 ledger truth
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [viewVoucher, setViewVoucher] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (!COMPANY_ID) return;
    loadVouchers();
    loadPartyBalances();
    // eslint-disable-next-line
  }, [COMPANY_ID]);

  const loadVouchers = async () => {
    try {
      setLocalLoading(true);

      // ✅ cache first
      const cached = localStorage.getItem("voucher_cache");

      if (cached) {
        const parsed = JSON.parse(cached);

        if (Date.now() - parsed.time < 60000) {
          setVouchers(parsed.data);
        }
      }

      const res = await getVouchersByCompany();
      const data = res.data || res || [];

      setVouchers(data);

      localStorage.setItem(
        "voucher_cache",
        JSON.stringify({
          data,
          time: Date.now(),
        }),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  const loadPartyBalances = async () => {
    try {
      const res = await getPartyWithDues();
      setPartyBalances(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredVouchers = useMemo(() => {
    const f = fromDate ? toYYYYMMDD(fromDate) : null;
    const t = toDate ? toYYYYMMDD(toDate) : null;

    return (vouchers || [])
      .filter(
        (v) =>
          v.voucher_type === "PAYMENT" ||
          v.voucher_type === "RECEIPT" ||
          v.voucher_type === "PURCHASE" || // 👈 ADD
          v.voucher_type === "SALE", // 👈 ADD (future proof)
      )
      .filter((v) => {
        if (!f || !t) return true;
        const d = (v.voucher_date || "").slice(0, 10);
        return d >= f && d <= t;
      })
      .filter((v) => {
        const q = search.toLowerCase();
        return (
          (v?.voucher_no || "").toLowerCase().includes(q) ||
          (v?.party_name || "").toLowerCase().includes(q) ||
          (v?.payment_mode || "").toLowerCase().includes(q) ||
          (v?.voucher_type || "").toLowerCase().includes(q) ||
          String(v?.payment_amount || "").includes(q)
        );
      })

      .sort((a, b) => b.id - a.id);
  }, [vouchers, fromDate, toDate, search]);

  const summary = useMemo(() => {
    let receipt = 0;
    let payment = 0;

    filteredVouchers.forEach((v) => {
      const amt = money(v.payment_amount);

      if (v.voucher_type === "RECEIPT") receipt += amt;

      if (
        v.voucher_type === "PAYMENT" ||
        v.voucher_type === "PURCHASE" // 👈 ADD
      ) {
        payment += amt;
      }
    });

    return {
      receipt,
      payment,
      total: receipt + payment,
    };
  }, [filteredVouchers]);

  const totalPages = Math.ceil(filteredVouchers.length / perPage);
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredVouchers.slice(start, start + perPage);
  }, [filteredVouchers, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [perPage, search, fromDate, toDate]);

  /* -------------------- Ledger Helpers -------------------- */
  const getPartyBalance = (partyId) => {
    const p = partyBalances.find((x) => x.id === partyId);
    if (!p) return null;

    const net = Number(p.sales_due) - Number(p.purchase_due);

    return {
      amount: Math.abs(net),
      type: net > 0 ? "RECEIVABLE" : net < 0 ? "PAYABLE" : "SETTLED",
    };
  };

  /* -------------------- Actions -------------------- */

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this voucher?")) return;

    try {
      await cancelVoucher(id);

      setVouchers((prev) => prev.filter((v) => v.id !== id));

      loadPartyBalances();
    } catch (err) {
      console.error("Delete failed:", err);
      showError("Failed to delete voucher");
    }
  };

  const handlePrint = async (row) => {
    const res = await getVoucherById(row.id);
    const v = res.data?.voucher;

    if (!v) return showError("Voucher not found");

    const company = JSON.parse(localStorage.getItem("company_data") || "{}");

    const companyData = {
      name: company.name || "COMPANY NAME",
      address1: company.address || "",
      address2: `${company.city || ""}, ${company.state || ""} - ${company.pincode || ""}`,
      gst_number: company.gst_number || "-",
      logo: company.logo
        ? `${import.meta.env.VITE_SERVER_URL}/${company.logo}`
        : "https://dummyimage.com/140x45/0f172a/ffffff.png&text=LOGO",
      signature: company.signature
        ? `${import.meta.env.VITE_SERVER_URL}/${company.signature}`
        : null,
    };

    const voucherDate = formatDate(v.voucher_date);
    const voucherNo = v.voucher_no || "-";

    const billToName = v.party_name || "-";
    const billToGstin = v.gst_no || "-";
    const billToAddress = v.address || "-";
    const billToEmail = v.email || "-";
    const billToMobile = v.mobile || "-";

    const subTotal = Number(v.payment_amount || 0);
    const igst = 0;
    const cgst = 0;
    const sgst = 0;

    const grandTotal = subTotal;
    const paidAmount = Number(v.payment_amount || 0);
    const balanceAmount = Number(v.due || 0);

    const reference = v.remark || "-";

    const itemsHtml = `
    <tr>
      <td>1. ${v.voucher_type} Voucher</td>
      <td class="right">₹ ${subTotal.toFixed(2)}</td>
    </tr>
  `;

    const html = `
  <html>
    <head>
      <title>Voucher Print</title>
      <style>
        *{ box-sizing:border-box; }
        body{
          font-family: Arial, sans-serif;
          padding: 20px;
          background:#fff;
          color:#111;
        }
        .page{
          width: 820px;
          margin: auto;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 18px;
        }
        .topHeader{
          display:flex;
          justify-content:space-between;
          gap:14px;
          align-items:flex-start;
        }
        .tax{
          font-size:11px;
          font-weight:700;
          color:#2563eb;
          margin-bottom:4px;
        }
        .companyName{
          font-size:16px;
          font-weight:800;
          margin:0;
          letter-spacing:.2px;
        }
        .companyInfo{
          font-size:11px;
          line-height:1.5;
          margin-top:4px;
          color:#111;
        }
        .rightTop{
          text-align:right;
          min-width:240px;
        }
        .original{
          font-size:10px;
          font-weight:700;
          color:#111;
          margin-bottom:6px;
        }
        .logo{
          width:140px;
          height:auto;
          margin-top:2px;
        }
        .hr{
          height:1px;
          background:#e5e7eb;
          margin:12px 0;
        }
        .row2{
          display:grid;
          grid-template-columns: 1fr 290px;
          gap:14px;
          align-items:start;
        }
        .billTo{
          font-size:11px;
          line-height:1.55;
        }
        .box{
          border:1px solid #dbeafe;
          background:#f8fafc;
          border-radius:8px;
          padding:10px;
          font-size:11px;
        }
        .boxGrid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:10px;
        }
        .boxTitle{
          font-weight:700;
          color:#111;
          margin-bottom:4px;
        }
        .ref{
          margin-top:10px;
          font-size:11px;
        }
        table{
          width:100%;
          border-collapse:collapse;
          margin-top:10px;
          font-size:11px;
        }
        th{
          text-align:left;
          background:#f1f5f9;
          padding:10px;
          border:1px solid #e5e7eb;
          font-weight:700;
        }
        td{
          padding:10px;
          border:1px solid #e5e7eb;
          vertical-align:top;
        }
        .right{ text-align:right; }
        .bottom{
          display:grid;
          grid-template-columns: 1fr 260px 280px;
          gap:14px;
          margin-top:12px;
          align-items:start;
        }
        .totals{
          border-radius:8px;
          overflow:hidden;
          border:1px solid #e5e7eb;
        }
        .tline{
          display:flex;
          justify-content:space-between;
          padding:10px 12px;
          border-bottom:1px solid #e5e7eb;
          font-size:11px;
        }
        .tline:last-child{ border-bottom:none; }
        .grand{
          background:#1d4ed8;
          color:#fff;
          font-weight:800;
        }
        .paid{
          background:#0f766e;
          color:#fff;
          font-weight:800;
        }
        .bal{
          background:#9ca3af;
          color:#fff;
          font-weight:800;
        }
        .note{
          text-align:center;
          font-size:10px;
          color:#1C2433;
          margin-top:14px;
          line-height:1.4;
        }
        @media print{
          body{ padding:0; }
          .page{ border:none; }
        }

        .signatureBox{
  margin-top:30px;
  text-align:right;
}

.signatureImg{
  height:60px;
}

.signatureLabel{
  font-size:11px;
  margin-top:4px;
  font-weight:600;
}
      </style>
    </head>

    <body>
      <div class="page">

        <div class="topHeader">
          <div>
            <div class="tax">VOUCHER</div>
            <h2 class="companyName">${companyData.name}</h2>

            <div class="companyInfo">
              ${companyData.address1}<br/>
              ${companyData.address2}<br/>
              <b>GSTIN:</b> ${companyData.gst_number}
            </div>
          </div>

          <div class="rightTop">
            <div class="original">ORIGINAL FOR RECIPIENT</div>
            <img class="logo" src="${companyData.logo}" />
          </div>
        </div>

        <div class="hr"></div>

        <div class="row2">
          <div class="billTo">
            <b>Party:</b><br/>
            <b>${billToName}</b><br/>
            <b>GSTIN:</b> ${billToGstin}<br/>
            ${billToAddress}<br/>
            <b>Email:</b> ${billToEmail}<br/>
            <b>Mobile No:</b> ${billToMobile}
          </div>

          <div>
            <div class="box">
              <div class="boxGrid">
                <div>
                  <div class="boxTitle">Voucher Date:</div>
                  ${voucherDate}
                </div>
                <div>
                  <div class="boxTitle">Voucher Number:</div>
                  ${voucherNo}
                </div>
              </div>
            </div>

            <div class="ref">
              <b>Reference:</b> ${reference}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="width:120px;" class="right">Price</th>
            </tr>
          </thead>

          <tbody>
            ${itemsHtml}

            <tr style="font-weight:700; background:#f1f5f9;">
              <td class="right">Total</td>
              <td class="right">₹ ${subTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="bottom">
          <div></div>

          <div></div>

          <div class="totals">
            <div class="tline"><span>Subtotal</span><span>₹ ${subTotal.toFixed(2)}</span></div>
            <div class="tline grand"><span>Grand Total</span><span>₹ ${grandTotal.toFixed(2)}</span></div>
            <div class="tline paid"><span>Paid amount</span><span>₹ ${paidAmount.toFixed(2)}</span></div>
            <div class="tline bal"><span>Balance amount</span><span>₹ ${balanceAmount.toFixed(2)}</span></div>
          </div>
        </div>z

        <div class="signatureBox">
  ${
    companyData.signature
      ? `<img class="signatureImg" src="${companyData.signature}" />`
      : ""
  }
  <div class="signatureLabel">
    Authorized Signatory
  </div>
</div>

        <div class="note">
          This is a computer generated voucher.
        </div>

      </div>
    </body>
  </html>
  `;

    const w = window.open("", "_blank", "width=950,height=750");
    w.document.write(html);
    w.document.close();

    w.onload = () => {
      w.print();
      w.onafterprint = () => w.close();
    };
  };

  const handleDownload = () => {
    const rows = filteredVouchers.map((v, i) => ({
      Sr: i + 1,
      Date: formatDate(v.voucher_date),
      VoucherNo: v.voucher_no,
      Type: v.voucher_type,
      Party: v.party_name,
      Amount: v.payment_amount,
      Mode: v.payment_mode,
      Due: v.due,
    }));

    const csv =
      "Sr,Date,VoucherNo,Type,Party,Amount,Mode,Due\n" +
      rows
        .map(
          (r) =>
            `${r.Sr},${r.Date},${r.VoucherNo},${r.Type},${r.Party},${r.Amount},${r.Mode},${r.Due}`,
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "voucher_report.csv";
    a.click();

    URL.revokeObjectURL(url);
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

    loadVouchers();
  };

  const exportExcel = () => {
    const rows = filteredVouchers.map((v, i) => ({
      Sr: i + 1,
      Date: formatDate(v.voucher_date),
      VoucherNo: v.voucher_no,
      Type: v.voucher_type,
      Party: v.party_name,
      Amount: money(v.payment_amount),
      Mode: v.payment_mode,
      Due: v.due,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Vouchers");

    XLSX.writeFile(wb, "Voucher_Report.xlsx");
  };

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

      doc.text("VOUCHER REPORT", pageWidth / 2, y, { align: "center" });

      /* ================= SUMMARY ================= */

      const receiptTotal = summary.receipt || 0;
      const paymentTotal = summary.payment || 0;
      const grandTotal = summary.total || 0;

      y += 8;

      doc.setFontSize(9);

      doc.text(`Date : ${today}`, 14, y);
      doc.setFont("helvetica", "bold");

      doc.setTextColor(0, 0, 0);
      doc.text(
        `Receipts : Rs ${receiptTotal.toFixed(2)}`,
        pageWidth / 2 - 40,
        y,
      );

      doc.setTextColor(0, 140, 0);
      doc.text(
        `Payments : Rs ${paymentTotal.toFixed(2)}`,
        pageWidth / 2 + 20,
        y,
      );

      doc.setTextColor(0, 0, 0);
      doc.text(`Total : Rs ${grandTotal.toFixed(2)}`, pageWidth - 14, y, {
        align: "right",
      });
      y += 6;

      const tableData = filteredVouchers.map((v, i) => [
        i + 1,

        formatDate(v.voucher_date),

        v.voucher_no,

        v.voucher_type,

        v.party_name,

        Number(v.payment_amount).toFixed(2),

        v.payment_mode,

        Number(v.due || 0).toFixed(2),
      ]);

      autoTable(doc, {
        startY: y,

        margin: { left: 14, right: 14 },

        head: [
          [
            "Sr",
            "Date",
            "Voucher No",
            "Type",
            "Party",
            "Amount",
            "Mode",
            "Due",
          ],
        ],

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
          5: { halign: "right" },
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

      doc.save(`Voucher_Report_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* TOP FILTER BAR */}
      {/* <div className="bg-white border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[111px] rounded-lg p-4 bg-green-100 border">
            <div className="text-sm text-gray-600">Receipts</div>
            <div className="text-lg font-semibold whitespace-nowrap">
              ₹ {Number(summary.receipt || 0).toFixed(2)}
            </div>
          </div>

          <div className="text-xl font-semibold text-gray-500">+</div>

          <div className="w-[112px] rounded-lg p-4 bg-blue-100 border">
            <div className="text-sm text-gray-600">Payments</div>
            <div className="text-lg font-semibold whitespace-nowrap">
              ₹ {Number(summary.payment || 0).toFixed(2)}
            </div>
          </div>

          <div className="text-xl font-semibold text-gray-500">=</div>

          <div className="w-[111px] rounded-lg p-4 bg-orange-200 border">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-lg font-semibold whitespace-nowrap">
              ₹ {Number(summary.total || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm px-3 py-2 bg-gray-100 rounded-md self-start sm:self-auto">
              Between
            </span>

            <DatePicker
              selected={fromDate}
              onChange={(date) => setFromDate(date)}
              dateFormat="dd-MM-yyyy"
              placeholderText="DD-MM-YYYYY"
              className="h-10 border rounded-md px-3 text-sm w-full sm:w-[150px]"
            />

            <span className="text-sm text-gray-500 self-start sm:self-auto">
              To
            </span>

            <DatePicker
              selected={toDate}
              onChange={(date) => setToDate(date)}
              dateFormat="dd-MM-yyyy"
              placeholderText="DD-MM-YYYYY"
              className="h-10 border rounded-md px-3 text-sm w-full sm:w-[150px]"
            />

            <button
              type="button"
              onClick={handleDateSearch}
              className="h-10 px-4 rounded-md bg-[#22A586] text-white font-semibold hover:opacity-90 w-full sm:w-auto flex items-center justify-center"
            >
              Search
            </button>
          </div>
        </div>
      </div> */}

      {/* TOP FILTER BAR */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        {/* Summary Cards */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Receipts */}
          <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-green-50 border">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Receipts
            </div>
            <div className="text-lg font-semibold text-green-700 truncate">
              ₹ {Number(summary.receipt || 0).toFixed(2)}
            </div>
          </div>

          <div className="text-lg font-semibold text-gray-400">+</div>

          {/* Payments */}
          <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-blue-50 border">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Payments
            </div>
            <div className="text-lg font-semibold text-blue-700 truncate">
              ₹ {Number(summary.payment || 0).toFixed(2)}
            </div>
          </div>

          <div className="text-lg font-semibold text-gray-400">=</div>

          {/* Total */}
          <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-orange-50 border">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Total
            </div>
            <div className="text-lg font-semibold text-orange-600 truncate">
              ₹ {Number(summary.total || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <span className="text-sm px-3 py-2 bg-gray-100 rounded-md text-gray-600">
              Between
            </span>

            {/* Date Pickers */}
            <div className="flex flex-wrap items-center gap-3">
              <DatePicker
                selected={fromDate}
                onChange={(date) => setFromDate(date)}
                dateFormat="dd-MM-yyyy"
                placeholderText="dd-mm-yyyy"
                className="h-10 border rounded-md px-3 text-sm w-[160px] focus:ring-2 focus:ring-[#22A586] outline-none"
              />

              <span className="text-sm text-gray-500">To</span>

              <DatePicker
                selected={toDate}
                onChange={(date) => setToDate(date)}
                dateFormat="dd-MM-yyyy"
                placeholderText="dd-mm-yyyy"
                className="h-10 border rounded-md px-3 text-sm w-[160px] focus:ring-2 focus:ring-[#22A586] outline-none"
              />
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={handleDateSearch}
              className="h-10 px-6 rounded-md bg-[#22A586] text-white font-medium hover:bg-[#1c8f75] transition-all w-full sm:w-auto"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* TABLE HEADER BAR */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              All Voucher List
            </h2>
            <span className="px-3 py-1 text-xs rounded-full bg-red-500 text-white font-semibold">
              {filteredVouchers.length} Records
            </span>
          </div>

          {/* Right Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            {/* Search Input */}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Input */}
              <div className="relative w-full sm:w-[240px]">
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search Voucher No..."
                  className="h-[36px] w-full border border-gray-300 rounded-md pl-10 pr-3 text-sm focus:outline-none focus:border-[#FF4200]"
                />

                <Search
                  size={16}
                  className="absolute left-3 top-[10px] text-gray-500"
                />
              </div>

              {/* Button */}
              <button
                onClick={handleSearch}
                className="h-[36px] px-4 bg-[#22A586] text-white rounded-md text-sm whitespace-nowrap"
              >
                Search
              </button>
            </div>

            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-[36px] px-4 rounded-md bg-yellow-500 text-white text-sm font-semibold flex items-center gap-2"
              >
                Export
                <ChevronDown size={16} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg">
                  <button
                    onClick={exportPDF}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2"
                  >
                    <FileText size={16} className="text-red-600" />
                    Export PDF
                  </button>

                  <button
                    onClick={exportExcel}
                    className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} className="text-green-600" />
                    Export Excel
                  </button>
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={() => navigate("/voucher/payment")}
              className="h-[36px] w-full sm:w-auto px-4 bg-[#22A586] text-white rounded-md text-sm font-medium"
            >
              + Create Voucher
            </button>
          </div>
        </div>

        {/* Pagination line */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-xs text-gray-600">
            Showing {(page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filteredVouchers.length)} of{" "}
            {filteredVouchers.length}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-[32px] border border-gray-300 rounded-md px-2 text-sm"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left w-[60px]">Sr</th>
                <th className="px-3 py-3 text-left">Party</th>
                <th className="px-3 py-3 text-left">Voucher No</th>
                <th className="px-3 py-3 text-left">Date</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-center w-[200px]">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    Loading vouchers...
                  </td>
                </tr>
              )}
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    No vouchers found
                  </td>
                </tr>
              ) : (
                paginated.map((v, index) => {
                  return (
                    <tr key={v.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3">
                        {(page - 1) * perPage + index + 1}
                      </td>

                      <td className="px-3 py-3 font-medium">
                        {v.party_name || "-"}
                      </td>

                      <td className="px-3 py-3 font-semibold text-blue-700">
                        {v.voucher_no || "-"}
                      </td>

                      <td className="px-3 py-3">
                        {formatDate(v.voucher_date)}
                      </td>

                      <td>
                        {v.voucher_type || "-"} /{" "}
                        {v.payment_type === "CASH"
                          ? "Cash"
                          : v.payment_type === "BANK"
                            ? v.payment_mode || "Bank"
                            : "-"}
                      </td>

                      <td className="px-3 py-3 text-right">
                        ₹ {money(v.payment_amount).toFixed(2)}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            title="View"
                            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                            onClick={async () => {
                              try {
                                const res = await getVoucherById(v.id);
                                setViewVoucher(res.data?.voucher || null);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            title="Edit"
                            className="p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                            onClick={() =>
                              navigate(`/voucher/payment?id=${v.id}`)
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            title="Print"
                            className="p-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                            onClick={() => handlePrint(v)}
                          >
                            <Printer size={16} />
                          </button>

                          <button
                            title="Delete"
                            className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                            onClick={() => handleDelete(v.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 p-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-sm font-semibold">
              {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {viewVoucher && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white w-[480px] rounded-xl shadow-xl overflow-hidden h-fit">
              {/* Header */}
              <div className="bg-gray-800 text-white px-4 py-2.5 flex justify-between items-center">
                <h3 className="text-sm font-semibold tracking-wide">
                  Voucher Details
                </h3>
                <button
                  onClick={() => setViewVoucher(null)}
                  className="text-gray-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-2.5 text-xs h-fit">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-semibold text-gray-500">Date</div>
                    <div className="text-gray-800">{formatDate(viewVoucher.voucher_date)}</div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500">Voucher No</div>
                    <div className="text-gray-800 font-semibold">{viewVoucher.voucher_no}</div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-2">
                  <div className="font-semibold text-gray-500">Party Name</div>
                  <div className="text-gray-800 font-semibold text-sm">{viewVoucher.party_name || "-"}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                  <div>
                    <div className="font-semibold text-gray-500 mb-1">Type</div>
                    <div
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                        viewVoucher.voucher_type === "PAYMENT"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {viewVoucher.voucher_type}
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500">Payment Details</div>
                    <div className="text-gray-800 font-medium">
                      {viewVoucher.payment_type} / {viewVoucher.payment_mode || "-"}
                      {viewVoucher.bank_name ? ` (${viewVoucher.bank_name})` : ""}
                    </div>
                    {viewVoucher.payment_mode?.toUpperCase() === "CHEQUE" && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Chq No: {viewVoucher.cheque_number || "-"} | Date: {viewVoucher.cheque_date ? formatDate(viewVoucher.cheque_date) : "-"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                  <div>
                    <div className="font-semibold text-gray-500">Amount</div>
                    <div className="text-sm font-bold text-emerald-700">
                      ₹ {Number(viewVoucher.payment_amount || 0).toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-500">Due</div>
                    <div className="text-sm font-bold text-red-600">
                      ₹ {Number(viewVoucher.due || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {viewVoucher.remark && (
                  <div className="border-t border-gray-100 pt-2">
                    <div className="font-semibold text-gray-500 mb-0.5">Remark</div>
                    <div className="text-gray-700 italic">"{viewVoucher.remark}"</div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 py-2.5 flex justify-end gap-2 border-t border-gray-100">
                <button
                  className="px-3.5 py-1.5 text-xs border rounded-md hover:bg-gray-100 bg-white"
                  onClick={() => setViewVoucher(null)}
                >
                  Close
                </button>

                <button
                  className="px-3.5 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
                  onClick={() => {
                    setViewVoucher(null);
                    navigate(`/voucher/payment?id=${viewVoucher.id}`);
                  }}
                >
                  Edit Voucher
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
