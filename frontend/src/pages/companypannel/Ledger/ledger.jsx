import { useEffect, useMemo, useState } from "react";
import { 
  ArrowLeft, Printer, Search, Phone, Mail, MapPin, CreditCard, 
  ArrowUpRight, ArrowDownRight, Scale, Briefcase, Download, Calendar, 
  ChevronDown, FileText, FileSpreadsheet, ChevronRight, Hash, Wallet, ArrowUp, ArrowDown
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext";

import {
  getPartyLedger,
  getPartyWithDues,
  getAllPartyLedger,
  getAllLedgerEntries,
} from "../../../api";
import { showError } from "../../../components/ui/alert/Alert";
import { formatDate, toYYYYMMDD } from "../../../utils/dateUtils";

const API_BASE = import.meta.env.VITE_SERVER_URL;

// formatDate and toYYYYMMDD are now imported from central dateUtils.js

const money = (v) => Number(v || 0);

const Info = ({ label, value }) => (
  <div>
    <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{label}</div>
    <div className="font-semibold text-sm text-gray-800 mt-1">{value || "—"}</div>
  </div>
);

const SummaryCard = ({ label, value, bg, text, border, suffix }) => (
  <div className={`rounded-xl p-4 border ${border || 'border-gray-200'} ${bg || 'bg-white'} shadow-xs flex flex-col justify-center`}>
    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</div>
    <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
      <div className={`text-xl font-extrabold ${text}`}>
        ₹ {Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      {suffix && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
          suffix.toLowerCase().includes("payable") 
            ? "bg-red-50 text-red-700 border-red-200" 
            : suffix.toLowerCase().includes("receivable") 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-slate-50 text-slate-600 border-slate-200"
        }`}>
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const parseVoucherDate = (str) => {
  if (!str) return null;

  // Case 1: DD/MM/YYYY
  if (str.includes("/")) {
    const [dd, mm, yyyy] = str.split("/");
    return new Date(yyyy, mm - 1, dd);
  }

  // Case 2: YYYY-MM-DD or ISO
  return new Date(str);
};
const PopperContainer = ({ children }) => {
  return <div style={{ zIndex: 50, position: "relative" }}>{children}</div>;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
/* ---------------- Main Component ---------------- */
export default function Ledgers() {
  // const { setLoading } = useContext(LoaderContext);
  const location = useLocation();
  const COMPANY_ID = JSON.parse(localStorage.getItem("company_data"))?.id;
  const navigate = useNavigate();

  const { partyId, employeeId, ledgerId } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      partyId: searchParams.get("party_id"),
      employeeId: searchParams.get("employee_id"),
      ledgerId: searchParams.get("ledger_id"),
    };
  }, [location.search]);

  const [party, setParty] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [allParties, setAllParties] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [partySearch, setPartySearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredLedger = useMemo(() => {
    console.log("Filtered Ledger:", ledger.length);
    console.log("Ledger data:", ledger);

    return (
      (ledger || [])
        .filter((r) => {
          if (!fromDate && !toDate) return true;

          const rowDate = parseVoucherDate(r.voucher_date);
          if (!rowDate) return false;

          if (fromDate && rowDate < startOfDay(fromDate)) return false;
          if (toDate && rowDate > endOfDay(toDate)) return false;

          return true;
        })
        .filter((r) => {
          const q = search.toLowerCase();
          return (
            (r?.ref_no || "").toLowerCase().includes(q) ||
            (r?.voucher_type || "").toLowerCase().includes(q)
          );
        })

        // ✅ SORT BY CREATED DATE (NOT voucher_date)
        .sort((a, b) => {
          return new Date(a.created_at) - new Date(b.created_at);
        })
    );
  }, [ledger, fromDate, toDate, search]);

  const ledgerWithBalance = useMemo(() => {
    let running = 0;

    return filteredLedger.map((r) => {
      const debit = money(r.debit);
      const credit = money(r.credit);

      running = running + credit - debit;

      return {
        ...r,
        running_balance: running,
      };
    });
  }, [filteredLedger]);

  const paginatedLedger = useMemo(() => {
    const start = (page - 1) * pageSize;
    return ledgerWithBalance.slice(start, start + pageSize);
  }, [ledgerWithBalance, page]);

  const loadAllParties = async () => {
    try {
      setLoading(true);

      const res = await getPartyWithDues(COMPANY_ID);
      setAllParties(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate, partyId]);

  const loadPartyLedger = async () => {
    try {
      setLoading(true);

      const res = await getPartyLedger(COMPANY_ID, Number(partyId));

      const partyData = res.data?.party || null;
      const entries = res.data?.entries || [];

      setParty(partyData);
      setLedger(entries);
    } finally {
      setLoading(false);
    }
  };

  const loadAllLedger = async () => {
    try {
      setLoading(true);

      const res = await getAllLedgerEntries(COMPANY_ID);

      const entries = res.data?.entries || [];

      setLedger(Array.isArray(entries) ? entries : []);
      setParty(null);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    filteredLedger.forEach((r) => {
      totalDebit += money(r.debit);
      totalCredit += money(r.credit);
    });

    const net = totalCredit - totalDebit;

    return {
      totalDebit,
      totalCredit,
      net,
    };
  }, [filteredLedger]);

  const partySummary = useMemo(() => {
    const map = {};

    ledger.forEach((r) => {
      let type = "ledger";
      let key = r.ledger_id ? `ledger_${r.ledger_id}` : null;
      let party_id = null;
      let employee_id = null;
      let ledger_id = r.ledger_id;

      if (r.ledger_party_id) {
        type = "party";
        key = `party_${r.ledger_party_id}`;
        party_id = r.ledger_party_id;
      } else if (r.ledger_employee_id) {
        type = "employee";
        key = `employee_${r.ledger_employee_id}`;
        employee_id = r.ledger_employee_id;
      }

      if (!key) return;

      if (!map[key]) {
        const partyInfo = party_id ? allParties.find((p) => p.id === party_id) : null;

        map[key] = {
          id: key, // Set unique key as the ID to avoid duplicates

          // 🔥 TYPE FIX
          type: type,

          party_id: party_id,
          employee_id: employee_id,
          ledger_id: ledger_id,
          ledger_name: r.ledger_name,

          display_name:
            r.party_name || r.employee_name || r.ledger_name || "Unknown",
          ledger_number:
            r.party_ledger_number ||
            r.employee_ledger_number ||
            r.ledger_number ||
            "-",

          mobile:
            partyInfo?.mobile ||
            partyInfo?.mobile_number ||
            partyInfo?.phone ||
            r.emp_phone || // 🔥 ADD THIS
            "-",

          address:
            partyInfo?.address ||
            partyInfo?.full_address ||
            partyInfo?.city ||
            r.emp_address || // 🔥 ADD THIS
            "-",

          totalDebit: 0,
          totalCredit: 0,
        };
      }

      map[key].totalDebit += money(r.debit);
      map[key].totalCredit += money(r.credit);
    });

    return Object.values(map).map((p) => ({
      ...p,
      balance: p.totalCredit - p.totalDebit,
    }));
  }, [ledger, allParties]);

  const paginatedPartySummary = useMemo(() => {
    const start = (page - 1) * pageSize;
    return partySummary.slice(start, start + pageSize);
  }, [partySummary, page]);

  useEffect(() => {
    if (!COMPANY_ID) return;

    loadAllParties();

    if (partyId) {
      loadPartyLedger();
    } else if (employeeId) {
      loadEmployeeLedger();
    } else if (ledgerId) {
      loadLedgerById();
    } else {
      loadAllLedger();
    }
  }, [COMPANY_ID, partyId, employeeId, ledgerId]);

  const loadEmployeeLedger = async () => {
    try {
      setLoading(true);

      const res = await getAllLedgerEntries(COMPANY_ID);

      const all = res.data?.entries || [];

      const filtered = all.filter(
        (r) => String(r.employee_id) === String(employeeId),
      );

      setLedger(filtered);

      const first = filtered[0] || {};

      setParty({
        id: employeeId,
        employee_name: first.employee_name || "Employee",
        mobile: first.emp_phone,
        address: first.emp_address,
        pan_number: first.emp_pan,
        email: first.emp_email,
        ledger_number: first.employee_ledger_number || first.ledger_number,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLedgerById = async () => {
    try {
      setLoading(true);

      const res = await getAllLedgerEntries(COMPANY_ID);

      const all = res.data?.entries || [];

      const filtered = all.filter(
        (r) => String(r.ledger_id) === String(ledgerId),
      );

      setLedger(filtered);

      setParty({
        id: ledgerId,
        ledger_name: filtered[0]?.ledger_name || "Ledger",
        ledger_number: filtered[0]?.ledger_number,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      try {
        if (!url) return resolve(null);

        if (url.startsWith("data:")) {
          return resolve(url);
        }

        let fullUrl = url;

        if (!url.startsWith("http")) {
          // fullUrl = `${import.meta.env.VITE_API_BASE}/${url}`;
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
      } catch {
        resolve(null);
      }
    });
  };

  const exportLedgerPDF = async () => {
    if (!party || ledgerWithBalance.length === 0) {
      showError("No ledger data");
      return;
    }

    const company = JSON.parse(localStorage.getItem("company_data")) || {};
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const today = formatDate(new Date());

    let y = 12;
    const logoUrl = company.logo ? `${API_BASE}/${company.logo}` : null;

    const base64Logo = await loadImageAsBase64(logoUrl);
    let logoWidth = 0;
    let logoHeight = 0;
    const logoX = 14;
    const logoY = 6;

    if (base64Logo) {
      const img = new Image();
      img.src = base64Logo;
      await new Promise((resolve) => (img.onload = resolve));
      const maxWidth = 40;
      const maxHeight = 18;
      logoWidth = maxWidth;
      logoHeight = (img.height / img.width) * logoWidth;

      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = (img.width / img.height) * logoHeight;
      }

      doc.addImage(base64Logo, "PNG", logoX, logoY, logoWidth, logoHeight);
    }

    const headerCenterY = logoHeight > 0 ? logoY + logoHeight / 2 : y;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(25);

    doc.text(
      (company.name || "").toUpperCase(),
      pageWidth / 2,
      headerCenterY - 2,
      { align: "center" },
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const infoLine = [
      [company.city, company.state, company.pincode].filter(Boolean).join(" "),

      company.mobile && `Mob: ${company.mobile}`,

      company.gst_number && `GSTIN: ${company.gst_number}`,
    ]
      .filter(Boolean)
      .join("   |   ");

    if (infoLine) {
      doc.text(infoLine, pageWidth / 2, headerCenterY + 4, { align: "center" });
    }

    if (company.address) {
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);

      doc.text(company.address, pageWidth / 2, headerCenterY + 9, {
        align: "center",
        maxWidth: pageWidth - 60,
      });
    }

    doc.setDrawColor(180);

    doc.line(14, headerCenterY + 13, pageWidth - 14, headerCenterY + 13);

    /* ================= TITLE ================= */

    y = headerCenterY + 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0);

    doc.text("PARTY LEDGER REPORT", pageWidth / 2, y, { align: "center" });

    /* ================= PARTY INFO ================= */

    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.text(`Party : ${party.party_name}`, 14, y);

    doc.text(`Date : ${today}`, pageWidth - 14, y, { align: "right" });

    y += 6;

    let totalDebit = 0;
    let totalCredit = 0;

    ledgerWithBalance.forEach((r) => {
      totalDebit += money(r.debit);
      totalCredit += money(r.credit);
    });

    const closingBalance = totalCredit - totalDebit;

    const balanceText =
      Math.abs(closingBalance).toFixed(2) +
      (closingBalance < 0 ? " Dr" : " Cr");

    /* ================= TABLE ================= */

    const tableData = ledgerWithBalance.map((r, i) => [
      i + 1,

      formatDate(r.voucher_date),

      r.ref_no || "-",

      r.voucher_type,

      r.dest_party_name || "-",

      money(r.debit).toFixed(2),

      money(r.credit).toFixed(2),

      `${Math.abs(r.running_balance).toFixed(2)} ${
        r.running_balance < 0 ? "Dr" : "Cr"
      }`,
    ]);

    autoTable(doc, {
      startY: y,

      margin: { left: 14, right: 14 },

      head: [
        [
          "Sr",
          "Date",
          "VCH No/Invoice No. ",
          "Type",
          "Third Party",
          "Debit",
          "Credit",
          "Balance",
        ],
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
        fillColor: [55, 65, 81],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },

      columnStyles: {
        0: { halign: "center", cellWidth: 10 },

        5: { halign: "right" },

        6: { halign: "right", textColor: [0, 140, 0] },

        7: { halign: "right", textColor: [0, 0, 0] },
      },
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);

    /* RIGHT SIDE SUMMARY BOX */

    const boxX = pageWidth - 80;
    const boxY = finalY;
    const boxWidth = 66;
    const rowHeight = 7;

    doc.setDrawColor(180);
    doc.rect(boxX, boxY, boxWidth, rowHeight * 3);

    /* TOTAL DEBIT */
    doc.text("Total Debit :", boxX + 3, boxY + 5);

    doc.setTextColor(200, 0, 0);

    doc.text(totalDebit.toFixed(2), boxX + boxWidth - 3, boxY + 5, {
      align: "right",
    });

    /* TOTAL CREDIT */

    doc.setTextColor(0);

    doc.text("Total Credit :", boxX + 3, boxY + 12);

    doc.setTextColor(0, 140, 0);

    doc.text(totalCredit.toFixed(2), boxX + boxWidth - 3, boxY + 12, {
      align: "right",
    });

    /* CLOSING BALANCE */

    doc.setTextColor(0);

    doc.text("Closing Balance :", boxX + 3, boxY + 19);

    doc.setTextColor(0);

    doc.text(balanceText, boxX + boxWidth - 3, boxY + 19, { align: "right" });

    /* ================= FOOTER ================= */

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

    /* ================= SAVE ================= */

    doc.save(`${party.party_name}_Ledger_${today.replace(/\//g, "-")}.pdf`);
  };

  const exportLedgerExcel = () => {
    if (!ledgerWithBalance.length) {
      showError("No ledger data");
      return;
    }

    const data = ledgerWithBalance.map((r, i) => ({
      Sr: i + 1,
      Date: formatDate(r.voucher_date),
      VoucherNo: r.ref_no,
      Type: r.voucher_type,
      "Third Party": r.dest_party_name || "-",
      Debit: money(r.debit),
      Credit: money(r.credit),
      Balance: r.running_balance,
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Ledger");

    // XLSX.writeFile(wb, "Party_Ledger.xlsx");
    XLSX.writeFile(wb, `${party.party_name}_Ledger.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {loading && (
        <div className="absolute inset-0  z-10 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-2">
            {/* <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div> */}
            <span className="text-sm text-gray-600">Fetching ledger...</span>
          </div>
        </div>
      )}
      {/* Unified Header & Party Info Box */}
      <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
        {/* Top Header Row */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100 bg-slate-50/40">
          <div className="flex items-center gap-3">
            {(partyId || employeeId || ledgerId) && (
              <button
                onClick={() => navigate(-1)}
                className="px-2.5 py-1 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-all shadow-3xs"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}

            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-800">
                {partyId
                  ? "Party Ledger"
                  : employeeId
                    ? "Employee Ledger"
                    : ledgerId
                      ? "Ledger Details"
                      : "Ledger Management"}
              </h1>
              {party && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm font-bold text-blue-600">
                    {party.party_name || party.employee_name || party.ledger_name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ID Badge on the right */}
          {party && (
            <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-[11px] font-semibold font-mono">
              Ledger No: {party.ledger_number || party.id}
            </span>
          )}
        </div>

        {/* Party Details (only if party exists) */}
        {party && (
          <div className="px-4 py-3 text-xs space-y-3 bg-white">
            {/* Address Row */}
            <div className="flex items-start gap-1.5 text-gray-600">
              <span className="font-semibold text-gray-500">Address:</span>
              <span>
                {party.address ? `${party.address}, ` : ""}
                {party.city || ""}
                {party.state ? `, ${party.state}` : ""}
                {party.pin ? ` - ${party.pin}` : ""}
                {(!party.address && !party.city && !party.state && !party.pin) && "—"}
              </span>
            </div>

            {/* META INFO GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2.5 border-t border-gray-100">
              <Info label="Mobile" value={party.mobile || party.phone || "-"} />
              <Info label="GST No" value={party.gst_no || "-"} />
              <Info label="Email" value={party.email || "-"} />
              <Info label="PAN" value={party.pan_number || "-"} />
            </div>
          </div>
        )}
      </div>

      {ledger.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Debit"
            value={summary.totalDebit}
            bg="bg-rose-50/30"
            border="border-rose-100/70"
            text="text-rose-600"
          />

          <SummaryCard
            label="Total Credit"
            value={summary.totalCredit}
            bg="bg-emerald-50/30"
            border="border-emerald-100/70"
            text="text-emerald-600"
          />

          <SummaryCard
            label={party ? "Net Balance" : "Overall Balance"}
            value={summary.net}
            bg="bg-blue-50/30"
            border="border-blue-100/70"
            text="text-blue-600"
            suffix={
              summary.net > 0
                ? "Payable"
                : summary.net < 0
                  ? "Receivable"
                  : "Settled"
            }
          />
        </div>
      )}

      {/* Party Summary Table (All Parties) */}
      {!partyId && !employeeId && !ledgerId && partySummary.length > 0 && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {/* HEADER ROW → SEARCH LEFT, PAGE SIZE RIGHT */}
          <div className="px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
            {/* LEFT → SEARCH BAR */}
            <div className="relative w-full sm:w-[350px]">
              <input
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search party by name or mobile..."
                className="
              h-10 w-full
              border border-gray-300
              rounded-md
              px-4
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
              />

              {/* Suggestions dropdown */}
              {showSuggestions && partySearch && (
                <div
                  className="
              absolute left-0 z-20 mt-1 w-full
              bg-white border rounded-md shadow
              max-h-60 overflow-auto
            "
                >
                  {allParties
                    .filter(
                      (p) =>
                        p.company_name
                          ?.toLowerCase()
                          .includes(partySearch.toLowerCase()) ||
                        p.mobile?.includes(partySearch),
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPartySearch(p.company_name);
                          setShowSuggestions(false);
                          navigate(`/ledger?party_id=${p.id}`);
                        }}
                        className="
                    w-full text-left
                    px-4 py-3
                    hover:bg-gray-50
                    border-b last:border-none
                  "
                      >
                        <div className="font-semibold text-sm">
                          {p.company_name}
                        </div>

                        <div className="text-xs text-gray-500">
                          📞 {p.mobile || "-"} • {p.city || "-"}
                        </div>
                      </button>
                    ))}

                  {allParties.filter(
                    (p) =>
                      p.company_name
                        ?.toLowerCase()
                        .includes(partySearch.toLowerCase()) ||
                      p.mobile?.includes(partySearch),
                  ).length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No party found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT → PAGE SIZE SELECTOR */}
            <div className="flex items-center gap-2 whitespace-nowrap ml-auto sm:ml-0">
              <span className="text-sm text-gray-500">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-500">items per page</span>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold">SR No.</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Ledger Number</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Party Name</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Address</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Total Debit</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Total Credit</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Balance</th>
                </tr>
              </thead>

              <tbody>
                {paginatedPartySummary.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      if (p.type === "party") {
                        navigate(`/ledger?party_id=${p.party_id}`);
                      } else if (p.type === "employee") {
                        navigate(`/ledger?employee_id=${p.employee_id}`);
                      } else {
                        navigate(`/ledger?ledger_id=${p.ledger_id}`);
                      }
                    }}
                    className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-all"
                  >
                    <td className="px-4 py-3.5 text-slate-400 font-medium">{(page - 1) * pageSize + i + 1}</td>

                    {/* 🔥 LEDGER NUMBER BADGE */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-mono shadow-3xs">
                        {p.ledger_number || "—"}
                      </span>
                    </td>

                    {/* 🔥 CLICKABLE LEDGER NAME */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800 hover:text-blue-700 hover:underline transition-all">
                        {p.ledger_name || p.display_name}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 font-medium">{p.mobile || "—"}</td>

                    <td className="px-4 py-3.5 text-slate-500 font-normal truncate max-w-[200px]" title={p.address}>
                      {p.address || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-right text-rose-600 font-semibold">
                      {money(p.totalDebit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3.5 text-right text-emerald-600 font-semibold">
                      {money(p.totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold">
                      <span className={p.balance > 0 ? "text-emerald-600" : p.balance < 0 ? "text-rose-600" : "text-slate-600"}>
                        {Math.abs(p.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-md font-bold ${p.balance < 0 ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                        {p.balance < 0 ? "Dr" : "Cr"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ledger table */}
      {party && ledger.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
            {/* Left Search */}
            <div className="relative w-full md:w-[280px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Voucher No / Type..."
                className="h-10 w-full border border-slate-200 rounded-xl pl-10 pr-4 text-sm bg-white hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <Search
                size={16}
                className="absolute left-3.5 top-3 text-slate-400 stroke-[2]"
              />
            </div>

            {/* Middle Date Pickers */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="From Date"
                  className="h-10 border border-slate-200 rounded-xl pl-9 pr-3 text-sm w-[150px] bg-white hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  popperPlacement="bottom-start"
                  popperContainer={PopperContainer}
                  popperModifiers={[
                    {
                      name: "preventOverflow",
                      options: {
                        boundary: "viewport",
                      },
                    },
                  ]}
                />
                <Calendar size={14} className="absolute left-3.5 top-[13px] text-slate-400 stroke-[1.8]" />
              </div>
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mx-1">to</span>
              <div className="relative">
                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="To Date"
                  className="h-10 border border-slate-200 rounded-xl pl-9 pr-3 text-sm w-[150px] bg-white hover:border-slate-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  popperPlacement="bottom-start"
                  popperContainer={PopperContainer}
                  popperModifiers={[
                    {
                      name: "preventOverflow",
                      options: {
                        boundary: "viewport",
                      },
                    },
                  ]}
                />
                <Calendar size={14} className="absolute left-3.5 top-[13px] text-slate-400 stroke-[1.8]" />
              </div>
            </div>

            {/* Right Export Button */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="h-10 px-4 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition-all flex items-center gap-2 shadow-xs"
              >
                <Download size={16} className="stroke-[2.2]" />
                Export
                <ChevronDown size={16} className={`transition-transform stroke-[2.2] ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      exportLedgerPDF();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-2.5"
                  >
                    <FileText size={16} className="text-red-500" />
                    Export PDF
                  </button>

                  <button
                    onClick={() => {
                      exportLedgerExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-2.5"
                  >
                    <FileSpreadsheet size={16} className="text-green-500" />
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold">Sr No.</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Bill Date</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Create Date</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Voucher No</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Type</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Third Party</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Debit</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Credit</th>
                  <th className="px-4 py-3.5 text-right font-semibold">Balance</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400 font-medium">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedLedger.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400 font-medium">
                      No data found
                    </td>
                  </tr>
                ) : (
                  paginatedLedger.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        {(page - 1) * pageSize + i + 1}
                      </td>

                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {formatDate(r.voucher_date)}
                      </td>

                      <td className="px-4 py-3 text-slate-500 font-normal">
                        {new Date(r.created_at).toLocaleDateString("en-GB")}
                      </td>

                      {/* ✅ Voucher No */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 font-semibold">
                        {r.ref_no || "—"}
                      </td>

                      {/* ✅ Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          (() => {
                            const type = (r.vch_type || r.voucher_type || "Journal").toLowerCase();
                            if (type.includes("receipt")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
                            if (type.includes("payment")) return "bg-rose-50 text-rose-700 border-rose-200";
                            if (type.includes("sale")) return "bg-blue-50 text-blue-700 border-blue-200";
                            if (type.includes("purchase")) return "bg-purple-50 text-purple-700 border-purple-200";
                            return "bg-slate-50 text-slate-700 border-slate-200";
                          })()
                        }`}>
                          {r.vch_type || r.voucher_type || "Journal"}
                        </span>
                      </td>

                      {/* ✅ Third Party */}
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {r.dest_party_name || "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-rose-600 font-semibold">
                        {money(r.debit) > 0 ? money(r.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold">
                        {money(r.credit) > 0 ? money(r.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        {Math.abs(r.running_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-md font-bold ${r.running_balance < 0 ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>
                          {r.running_balance < 0 ? "Dr" : "Cr"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {((party ? ledgerWithBalance.length : partySummary.length) >= 1) && (
        <div className="flex justify-center items-center gap-3 p-4 bg-white border rounded-xl shadow-sm">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-100"
          >
            Prev
          </button>

          <span className="text-sm font-medium">
            Page {page} of {Math.ceil((party ? ledgerWithBalance.length : partySummary.length) / pageSize)}
          </span>

          <button
            disabled={page >= Math.ceil((party ? ledgerWithBalance.length : partySummary.length) / pageSize)}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border rounded-md text-sm disabled:opacity-50 hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}