import { useMemo, useState, useEffect } from "react";
import { Eye, Pencil, Printer, Trash2, Search, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getPurchasesByCompany,
  deletePurchase,
  downloadPurchaseDoc,
} from "../../../api";

import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext"; // path adjust

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { showError } from "../../../components/ui/alert/Alert";

export default function PurchageBill() {
  const { setLoading } = useContext(LoaderContext);
  const [loading, setLocalLoading] = useState(false);
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // ============================
  // ✅ Default Current Month Dates (Date Object)
  // ============================
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // ============================
  // ✅ Filters State (Date Object)
  // ============================
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const money = (v) => Number(v || 0);

  // ============================
  // Normalize Bills
  // ============================
  const normalizedBills = useMemo(() => {
    return (bills || []).map((b) => {
      const total = money(b.total_amount ?? 0);
      const paid = money(b.paid_amount ?? 0);
      const due = money(b.due_amount || Math.max(total - paid, 0));

      return {
        id: b.bill_id,
        party_id: b.party_id,
        date: (b.voucher_date || "").slice(0, 10),
        invoiceNo: b.supplier_invoice_no || "-",
        party: b.party || "-",
        mode: b.mode || "ITEM",
        total,
        paid,
        due,
        rows: b.rows || [],

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

  // ============================
  // ✅ Date Format Helpers (FIXED - NO toISOString)
  // ============================
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

  // ============================
  // ✅ Filter Bills (Front-end filter)
  // ============================
  const filteredBills = useMemo(() => {
    const from = formatDateYYYYMMDD(fromDate);
    const to = formatDateYYYYMMDD(toDate);

    return normalizedBills.filter((b) => {
      const s = search.toLowerCase();
      const billDate = (b.date || "").slice(0, 10);

      const inDateRange =
        (!from || billDate >= from) && (!to || billDate <= to);

      const matchSearch =
        String(b.invoiceNo || "")
          .toLowerCase()
          .includes(s) ||
        String(b.party || "")
          .toLowerCase()
          .includes(s) ||
        String(b.mode || "")
          .toLowerCase()
          .includes(s);

      return inDateRange && matchSearch;
    });
  }, [normalizedBills, search, fromDate, toDate]);

  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentData = filteredBills.slice(indexOfFirst, indexOfLast);


  useEffect(() => {
    setCurrentPage(1);
  }, [search, fromDate, toDate]);
  // ============================
  // View Modal
  // ============================
  const [showView, setShowView] = useState(false);
  const [viewBill, setViewBill] = useState(null);

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  // ============================
  // ✅ Fetch Bills (API call)
  // ============================

  const fetchBills = async () => {
    if (!companyId) return;

    try {
      setLocalLoading(true);

      // ✅ cache show first (instant UI)
      const cached = localStorage.getItem("purchase_cache");
      if (cached) {
        setBills(JSON.parse(cached));
      }

      const res = await getPurchasesByCompany({
        fromDate: formatDateYYYYMMDD(fromDate),
        toDate: formatDateYYYYMMDD(toDate),
        search,
      });

      const data = Array.isArray(res.data?.data) ? res.data.data : [];

      setBills(data);

      // ✅ cache save
      localStorage.setItem("purchase_cache", JSON.stringify(data));
    } catch (err) {
      console.error("Fetch purchases failed:", err);
      setBills([]);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [companyId, fromDate, toDate]); // search hata

  // ============================
  // ✅ Search Button Handler
  // ============================
  const handleDateSearch = () => {
    if (!fromDate || !toDate) {
      showError("Please select both dates!");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      showError("From Date should be smaller than To Date");
      return;
    }

    fetchBills();
  };

  // ============================
  // Totals
  // ============================
  const totalAmount = filteredBills.reduce((sum, b) => sum + money(b.total), 0);
  const totalPaid = filteredBills.reduce((sum, b) => sum + money(b.paid), 0);
  const totalDue = filteredBills.reduce((sum, b) => sum + money(b.due), 0);

  // ============================
  // Delete Bill
  // ============================
  const deleteBill = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this bill?");
    if (!ok) return;

    try {
      setLoading(true);
      await deletePurchase(id);

      // instant UI update
      setBills((prev) => prev.filter((b) => b.bill_id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      showError("Delete failed");
    } finally {
      setLoading(false); // ✅ STOP
    }
  };

  const openView = (bill) => {
    setViewBill(bill);
    setShowView(true);
  };

  const downloadBill = async (invoiceNo, documentPath) => {
    try {
      const res = await downloadPurchaseDoc(invoiceNo);

      // 🔥 extension document path se nikalo
      let extension = "file";
      if (documentPath) {
        extension = documentPath.split(".").pop().toLowerCase();
      }

      const blob = new Blob([res.data]); // ❗ content-type ignore
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Purchase-${invoiceNo}.${extension}`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      showError("Document not available");
    }
  };

  const openEdit = (bill) => {
    navigate(`/expense/purchase/create?mode=edit&id=${bill.id}`);
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

  const handleSearch = () => {
    setSearch(searchInput);
    fetchBills();
  };

  const totalPages = Math.ceil(filteredBills.length / recordsPerPage);

  return (
    <div className="w-full min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-white border-b px-5 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-800">
            Purchase Management
          </div>
        </div>

        {/* Filters + Summary */}
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          {/* Summary Cards */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Paid */}
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-green-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Paid
              </div>
              <div className="text-lg font-semibold text-green-700 truncate">
                ₹ {Number(totalPaid || 0).toFixed(2)}
              </div>
            </div>

            <div className="text-lg font-semibold text-gray-400">+</div>

            {/* Due */}
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-blue-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Due
              </div>
              <div className="text-lg font-semibold text-blue-700 truncate">
                ₹ {Number(totalDue || 0).toFixed(2)}
              </div>
            </div>

            <div className="text-lg font-semibold text-gray-400">=</div>

            {/* Total */}
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-orange-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Total
              </div>
              <div className="text-lg font-semibold text-orange-600 truncate">
                ₹ {Number(totalAmount || 0).toFixed(2)}
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

        {loading && (
          <div className="px-4 py-2 text-sm text-gray-500">Loading data...</div>
        )}

        {/* TABLE */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b">
            {/* LEFT */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                All Bill Report
              </h2>

              <span className="px-3 py-1 text-xs rounded-full bg-red-500 text-white font-semibold">
                {filteredBills.length} Records
              </span>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-[240px]">
                <Search
                  size={20}
                  className="absolute left-3 top-[10px] text-gray-500"
                />

                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search Invoice No..."
                  className="h-[36px] w-full border border-gray-300 rounded-md pl-10 pr-3 text-sm focus:outline-none focus:border-[#FF4200]"
                />
              </div>

              <button
                onClick={() => navigate("/expense/purchase/create")}
                className="h-10 px-5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                + Create Purchase Bill
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl">
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
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-500">
                      Loading data...
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  currentData.map((b, index) => (
                    <tr key={b.id} className="border hover:bg-gray-50">
                      <td className="p-3 text-center border">{indexOfFirst + index + 1}</td>

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

                      <td className="p-3 whitespace-nowrap text-red-600 border">
                        ₹ {money(b.due).toFixed(2)}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                            onClick={() => openView(b)}
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                            onClick={() => openEdit(b)}
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                            onClick={() =>
                              downloadBill(b.invoiceNo, b.document)
                            }
                          >
                            <Download size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                            onClick={() => printBill(b)}
                          >
                            <Printer size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                            onClick={() => deleteBill(b.id || b.bill_id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex items-center justify-between">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {/* VIEW MODAL */}
      {showView && viewBill && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-3">
          <div
            className="bg-white rounded-xl shadow-2xl 
         w-full max-w-[700px] 
         max-h-[90vh] 
         flex flex-col overflow-hidden"
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
                            downloadBill(viewBill.invoiceNo, viewBill.document)
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

  const base = import.meta.env.VITE_SERVER_URL; // ✅ use this

  return `${base}/${path.replace(/\\/g, "/")}`;
};
