import { useState, useMemo } from "react";
import ConsoleBillForm from "./console-bill";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Search } from "lucide-react";
import { Pencil, Trash2, Eye } from "lucide-react";

export default function ConsoleBillPage() {
  const [showForm, setShowForm] = useState(false);
  const [bills, setBills] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [viewBill, setViewBill] = useState(null);
  const [errors, setErrors] = useState({});

  // 🔍 FILTER STATES
  const [userType, setUserType] = useState("All");
  const [paymentType, setPaymentType] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [lrSearch, setLrSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");

  // 📄 PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ================= SAVE / EDIT / DELETE ================= */

  const handleSave = (data) => {
    if (editIndex !== null) {
      const updated = [...bills];
      updated[editIndex] = data;
      setBills(updated);
      setEditIndex(null);
    } else {
      setBills((prev) => [...prev, data]);
    }
    setShowForm(false);
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setShowForm(true);
  };

  const handleDelete = (index) => {
    if (confirm("Delete this bill?")) {
      setBills((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleBack = () => {
    setShowForm(false);
    setEditIndex(null);
  };

  const validateFilters = () => {
    const newErrors = {};

    // Payment Type
    if (!paymentType) {
      newErrors.paymentType = "Payment type is required";
    }

    // Date validation
    if (startDate && endDate && startDate > endDate) {
      newErrors.date = "Start date cannot be after end date";
    }

    // LR Search
    if (lrSearch && lrSearch.length < 3) {
      newErrors.lrSearch = "Enter at least 3 characters";
    }

    // Invoice Search
    if (invoiceSearch && invoiceSearch.length < 3) {
      newErrors.invoiceSearch = "Enter at least 3 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBillData = (bill) => {
    const errors = {};

    // GST Validation
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (bill.gst_no && !gstRegex.test(bill.gst_no)) {
      errors.gst_no = "Invalid GST number format";
    }

    // Phone Validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (bill.phone && !phoneRegex.test(bill.phone)) {
      errors.phone = "Invalid phone number";
    }

    // Number Validation
    const numberRegex = /^\d+(\.\d{1,2})?$/;

    ["sub_total", "igst", "cgst", "sgst", "grand_total"].forEach((field) => {
      const value = bill[field] ?? "0";

      if (!numberRegex.test(String(value))) {
        errors[field] = "Only numbers allowed (max 2 decimals)";
      }
    });

    return errors;
  };

  /* ================= FILTER LOGIC ================= */

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (userType !== "All" && bill.user_type !== userType) return false;
      if (paymentType !== "All" && bill.payment_mode !== paymentType)
        return false;

      if (lrSearch && !bill.Lr?.toLowerCase().includes(lrSearch.toLowerCase()))
        return false;

      if (
        invoiceSearch &&
        !bill.billNo?.toLowerCase().includes(invoiceSearch.toLowerCase())
      )
        return false;

      if (startDate) {
        const d = new Date(bill.invoice_date);
        if (d < startDate) return false;
      }

      if (endDate) {
        const d = new Date(bill.invoice_date);
        if (d > endDate) return false;
      }

      return true;
    });
  }, [
    bills,
    userType,
    paymentType,
    lrSearch,
    invoiceSearch,
    startDate,
    endDate,
  ]);

  /* ================= PAGINATION ================= */

  const totalRecords = filteredBills.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);

  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredBills.slice(start, start + rowsPerPage);
  }, [filteredBills, currentPage, rowsPerPage]);

  /* ================= UI ================= */

  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-4 bg-[#F3F0EC] min-h-screen">
      <h1 className="font-semibold">Console Bill managment</h1>
      {/* ================= FORM ================= */}
      {showForm && (
        <>
          <button onClick={handleBack} className="mb-4 text-sm text-gray-600">
            ← Back to Console Bills
          </button>

          <ConsoleBillForm
            onSave={handleSave}
            initialData={editIndex !== null ? bills[editIndex] : null}
            isEdit={editIndex !== null}
          />
        </>
      )}

      {/* ================= LIST ================= */}
      {!showForm && (
        <>
          {/* ===== FILTER BAR ===== */}

          <div
            className="
    bg-[#f3efe9] p-5 rounded-xl mb-2
    grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6
    gap-x-4 gap-y-5 capitalize
  "
          >
            {/* USER TYPE */}
            <div className="flex flex-col ">
              <label className="text-sm text-gray-600 mb-1 ">User Type</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="
                border border-black
        h-10 rounded-lg border px-3 bg-white
        focus:border-[#FF4200]
        focus:outline-none
        focus:ring-2 focus:ring-[#FF4200]/30 text-gray-600 capitalize
      "
              >
                <option>All</option>
                <option>User</option>
                <option>Branch</option>
              </select>
            </div>

            {/* CHOOSE ONE */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Choose One</label>
              <select
                className="
        h-10 rounded-lg border border-black px-3 bg-white
        focus:border-[#FF4200]
        focus:outline-none
        focus:ring-2 focus:ring-[#FF4200]/30 text-gray-600 capitalize
      "
              >
                <option>Choose one</option>
              </select>
            </div>

            {/* PAYMENT TYPE */}

            <div className="flex flex-col w-52 ">
              <label className="text-sm text-gray-600 mb-1">Payment Type</label>

              <select
                value={paymentType}
                onChange={(e) => {
                  setPaymentType(e.target.value);
                  setErrors((prev) => ({ ...prev, paymentType: "" }));
                }}
                className=" mr-2 
      h-10 rounded-lg border border-black px-3 bg-white
      focus:border-[#FF4200]
      focus:outline-none focus:ring-2 focus:ring-[#FF4200]/30
      text-gray-600 capitalize
    "
              >
                <option value="">Select Payment Type</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </select>
            </div>

            {/* START DATE */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                dateFormat="dd-MM-yyyy"
                placeholderText="DD-MM-YYYY"
                maxDate={new Date()}
                className=" ml-12
        h-10 w-32 rounded-lg border border-black px-3 bg-white
        focus:border-[#FF4200]
        focus:outline-none
        focus:ring-2 focus:ring-[#FF4200]/30 capitalize
      "
              />
            </div>

            {/* END DATE */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                dateFormat="dd-MM-yyyy"
                placeholderText="DD-MM-YYYY"
                minDate={startDate}
                maxDate={new Date()}
                className=" ml-6
        h-10 w-32 rounded-lg border border-black px-3 bg-white
        focus:border-[#FF4200]
        focus:outline-none
        focus:ring-2 focus:ring-[#FF4200]/30 capitalize
      "
              />
            </div>

            {/* SEARCH BUTTON */}
            <div className="flex flex-col justify-end">
              <button
                onClick={() => {
                  if (!validateFilters()) return;
                  setCurrentPage(1);
                }}
                className=" w-30
        h-10 rounded-lg bg-[#3B4953] text-white
        hover:bg-[#2f3a42] transition capitalize
      "
              >
                Search
              </button>
            </div>
          </div>

          {/* ===== TOP BAR ===== */}
          <div className="bg-white rounded-xl shadow border">
            {/* TOP BAR */}
            <div className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-semibold text-gray-800">90</h2>
                <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full">
                  {totalRecords} Records
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* 🔍 LR SEARCH */}
                <div className="relative w-full sm:w-56">
                  <input
                    value={lrSearch}
                    onChange={(e) => {
                      setLrSearch(e.target.value);
                      setErrors((prev) => ({ ...prev, lrSearch: "" }));
                    }}
                    placeholder="Search LR number..."
                    className={`w-full rounded-lg border px-3 pr-10 py-2 focus:border-[#FF4200] focus:outline-none focus:ring-0
   
                    `}
                  />

                  {errors.lrSearch && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.lrSearch}
                    </p>
                  )}

                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600">
                    <Search size={18} />
                  </span>
                </div>

                {/* 🔍 INVOICE SEARCH */}
                <div className="relative w-full sm:w-56">
                  <input
                    placeholder="Search Invoice No..."
                    className=" w-full rounded-lg border px-3 pr-10 py-2 focus:border-[#FF4200] focus:outline-none focus:ring-0
"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600">
                    <Search size={18} />
                  </span>

                  {errors.invoiceSearch && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.invoiceSearch}
                    </p>
                  )}
                </div>

                {/* ➕ ADD BUTTON */}
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditIndex(null);
                  }}
                  className="bg-[#22A586] text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
                >
                  + Create Console Bill
                </button>
              </div>
            </div>
            <div className="px-4 py-3 border-t flex flex-col sm:flex-row gap-2 sm:justify-between text-sm text-gray-500">
              <span>
                Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                {Math.min(currentPage * rowsPerPage, totalRecords)} of{" "}
                {totalRecords}
              </span>
              <select className="border rounded px-2 py-1 w-40">
                <option>10 per page</option>
                <option>20 per page</option>
              </select>
            </div>

            {/* ===== TABLE ===== */}
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="min-w-full border-separate border-spacing-0 text-sm capitalize">
                <thead className="bg-[#6E6E6E] text-white">
                  <tr>
                    {[
                      "Sr",
                      "Bill No",
                      "Company",
                      "GST",
                      "Invoice Date",
                      "Payment",
                      "Sub Total",
                      "Grand Total",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="
          px-4 py-3 text-left text-sm font-semibold
          border-b border-gray-500
          whitespace-nowrap
        "
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {paginatedBills.map((bill, i) => (
                    <tr
                      key={i}
                      className={`
        border-b
        ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}
        hover:bg-gray-100 transition
      `}
                    >
                      <td className="px-4 py-3 text-center font-medium">
                        {(currentPage - 1) * rowsPerPage + i + 1}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-block min-w-[72px] px-3 py-1 text-xs font-semibold rounded-md bg-green-600 text-white">
                          {bill.billNo || "012456677"}
                        </span>
                      </td>

                      <td className="px-4 py-3">{bill.company_name}</td>

                      <td className="px-4 py-3 text-gray-700">
                        {bill.gst_no || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(bill.invoice_date)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`
            inline-block min-w-[90px] text-center px-3 py-1 text-xs font-semibold rounded-full text-white
            ${bill.payment_mode === "Paid" && "bg-emerald-600"}
            ${bill.payment_mode === "To-Pay" && "bg-orange-500"}
            ${bill.payment_mode === "Credit" && "bg-sky-600"}
          `}
                        >
                          {bill.payment_mode}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium">
                        ₹{bill.sub_total}
                      </td>

                      <td className="px-4 py-3 font-semibold text-green-600">
                        ₹{bill.grand_total}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => setViewBill(bill)}
                            className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-indigo-600 transition"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => handleEdit(i)}
                            className="p-2 rounded-full text-blue-600 hover:bg-blue-100 transition"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(i)}
                            className="p-2 rounded-full text-red-600 hover:bg-red-100 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {totalRecords === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        className="py-16 text-center text-gray-400"
                      >
                        No invoices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ===== PAGINATION ===== */}
            <div className="p-3 border-t flex justify-between items-center text-sm">
              <div className="flex gap-2 items-center">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="border px-3 py-1 rounded disabled:opacity-40"
                >
                  Prev
                </button>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="border px-3 py-1 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= VIEW MODAL ================= */}
      {viewBill && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          {/* CARD */}
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
            {/* HEADER */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-[#f8fafc]">
              <h3 className="text-lg font-semibold text-gray-800">
                Console Bill Details
              </h3>
              <button
                onClick={() => setViewBill(null)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ×
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Detail label="Bill No" value={viewBill.billNo} />
              <Detail label="Invoice Date" value={viewBill.invoice_date} />

              <Detail label="Company" value={viewBill.company_name} />
              <Detail label="City" value={viewBill.city} />

              <Detail label="State" value={viewBill.state} />
              <Detail label="GST No" value={viewBill.gst_no} />

              <Detail
                label="Payment Mode"
                value={
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold text-white
                ${viewBill.payment_mode === "Paid" && "bg-emerald-600"}
                ${viewBill.payment_mode === "To-Pay" && "bg-orange-500"}
                ${viewBill.payment_mode === "Credit" && "bg-sky-600"}
              `}
                  >
                    {viewBill.payment_mode}
                  </span>
                }
              />

              <Detail label="Sub Total" value={`₹${viewBill.sub_total}`} />
              <Detail label="IGST" value={`₹${viewBill.igst}`} />
              <Detail label="CGST" value={`₹${viewBill.cgst}`} />
              <Detail label="SGST" value={`₹${viewBill.sgst}`} />

              <Detail
                label="Grand Total"
                value={
                  <span className=" font-semibold text-green-800 ">
                    ₹{viewBill.grand_total}
                  </span>
                }
              />
              <Detail
                label="LR's"
                value={
                  <span className="text-gray-800">{viewBill.lr_numbers}</span>
                }
              />
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t flex justify-end bg-[#f8fafc]">
              <button
                onClick={() => setViewBill(null)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
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
  <div className="flex flex-col gap-1">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-gray-800">{value || "-"}</span>
  </div>
);
