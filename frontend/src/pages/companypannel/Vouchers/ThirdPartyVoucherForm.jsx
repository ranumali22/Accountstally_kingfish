import { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ArrowLeft, Search, Pencil, Trash2 } from "lucide-react";
import {
  searchParty,
  getNextVoucherNumber,
  getPartyDues,
  createThirdPartyJournal,
  getJournalsByCompany,
  deleteJournal,
  getJournalById,
  updateThirdPartyJournal,
  getBanks,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";
import { toYYYYMMDD } from "../../../utils/dateUtils";

const FloatingInput = ({
  label,
  required = false,
  value,
  onChange,
  disabled = false,
  placeholder = "",
  type = "text",
}) => {
  return (
    <div className="relative w-full">
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder=" "
        className={`
          peer w-full h-[44px]
          rounded-[10px]
          px-[14px]
          text-sm bg-white outline-none
          border border-gray-800
          focus:border-[#FF4200]
        `}
      />

      <label
        className="
          absolute left-4 bg-white px-1 text-gray-800 text-sm
          transition-all cursor-text
          -top-2
          peer-placeholder-shown:text-gray-800
          peer-focus:-top-2
          peer-focus:text-[#FF4200]
        "
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
};

const FloatingSelect = ({
  label,
  required = false,
  value,
  onChange,
  children,
}) => {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={onChange}
        className="peer h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition border-gray-800 focus:border-[#FF4200]"
      >
        {children}
      </select>

      <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
};

function FloatingDatePicker({
  label,
  value,
  onChange,
  required,
  className = "",
}) {
  const ref = useRef(null);

  return (
    <div className={`relative ${className}`}>
      <DatePicker
        ref={ref}
        selected={value}
        onChange={onChange}
        dateFormat="dd/MM/yyyy"
        popperPlacement="bottom-start"
        placeholderText=" "
        required={required}
        className="peer w-full h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm
           focus:outline-none focus:border-[#FF4200]"
      />
      <label className="absolute left-3 -top-2 bg-white px-1 text-xs font-medium text-gray-700 peer-focus:text-[#FF4200]">
        {label}
      </label>
    </div>
  );
}

const FloatingTextarea = ({
  label,
  required = false,
  value,
  onChange,
  rows = 3,
}) => {
  return (
    <div className="relative w-full">
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder=" "
        className="
          peer w-full rounded-xl px-4 py-2 text-sm bg-white outline-none
          border border-gray-800 resize-none
          focus:border-[#FF4200]
        "
      />

      <label
        className="
          absolute left-4 bg-white px-1 text-gray-700 text-sm
          transition-all cursor-text
          -top-2
          peer-placeholder-shown:text-gray-800
          peer-focus:-top-2
          peer-focus:text-[#FF4200]
        "
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
};

const toDateObj = (yyyy_mm_dd) => (yyyy_mm_dd ? new Date(yyyy_mm_dd) : null);
const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB");
};

export default function ThirdPartyVoucherForm({ onClose }) {
  const COMPANY_ID = JSON.parse(localStorage.getItem("company_data"))?.id;
  const [mode, setMode] = useState("list");
  const [editVoucherId, setEditVoucherId] = useState(null);
  const [form, setForm] = useState({
    voucher_no: "Auto",
    voucher_date: toYYYYMMDD(new Date()),
    party_id: "",
    party_name: "",
    gst_no: "",
    address: "",
    pin: "",
    city: "",
    state: "",
    mobile: "",
    voucher_type: "thirdparty_payment",
    paid_amount: "",
    due_amount: "",
    total_amount: "",
    payment_type: "cash", 
    bank_name: "",
    payment_mode: "upi", 
    check_number: "",
    
    transactionType: "COD", 
    remark: "",
  });

  const [partySearch, setPartySearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ledgers, setLedgers] = useState([]);
  const [destSearch, setDestSearch] = useState("");
  const [destParties, setDestParties] = useState([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [destPartyId, setDestPartyId] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bankList, setBankList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const calculatedDue = useMemo(() => {
    return Math.max(
      Number(form.total_amount || 0) - Number(form.paid_amount || 0),
      0
    );
  }, [form.total_amount, form.paid_amount]);

  // Fetch bank list from company ID
  useEffect(() => {
    if (!COMPANY_ID) return;
    getBanks(COMPANY_ID)
      .then((res) => {
        setBankList(res.data || []);
      })
      .catch((err) => {
        console.error("Bank fetch failed", err);
      });
  }, [COMPANY_ID]);

  // Load next journal voucher number
  const fetchNextVoucher = () => {
    if (!COMPANY_ID) return;
    const typeKey = form.voucher_type === "thirdparty_receipt" ? "THIRDPARTY_RECEIPT" : "THIRDPARTY_PAYMENT";
    getNextVoucherNumber(typeKey)
      .then((res) => {
        if (res.data?.success) {
          setForm((prev) => ({ ...prev, voucher_no: res.data.voucher_no }));
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (mode === "create") {
      fetchNextVoucher();
    }
  }, [COMPANY_ID, mode, form.voucher_type]);

  // Load existing third-party vouchers
  const loadTableVouchers = async () => {
    if (!COMPANY_ID) return;
    try {
      setTableLoading(true);
      const res = await getJournalsByCompany(COMPANY_ID);
      const list = (res.data || []).filter(
        (v) => v.payment_type === "thirdparty",
      );
      setVouchers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "list") {
      loadTableVouchers();
    }
  }, [COMPANY_ID, mode]);


  // Search Party Name (Source)
  useEffect(() => {
    if (!partySearch || !COMPANY_ID || partySearch.includes("[")) {
      setLedgers([]);
      return;
    }
    searchParty({ q: partySearch, company_id: COMPANY_ID })
      .then((res) => setLedgers(res.data || []))
      .catch(console.error);
  }, [partySearch, COMPANY_ID]);

  
  // Search To Party (Destination)
  useEffect(() => {
    if (!destSearch || !COMPANY_ID || destSearch.includes("[")) {
      setDestParties([]);
      return;
    }
    searchParty({ q: destSearch, company_id: COMPANY_ID })
      .then((res) => setDestParties(res.data || []))
      .catch(console.error);
  }, [destSearch, COMPANY_ID]);

  const filteredParties = useMemo(() => {
    const q = (partySearch || "").toLowerCase();
    return (ledgers || [])
      .filter((l) => {
        return (
          (l?.company_name || "").toLowerCase().includes(q) ||
          String(l?.id || "").includes(q) ||
          String(l?.mobile_number || "").includes(q)
        );
      })
      .slice(0, 10);
  }, [ledgers, partySearch]);

  const handleSelectSuggestion = (party) => {
    setForm((prev) => ({
      ...prev,
      party_id: party.id,
      party_name: party.company_name || "",
      mobile: party.mobile_number || "",
      gst_no: party.gst_number || "",
      address: party.address || "",
      pin: party.pincode || "",
      city: party.city || "",
      state: party.state || "",
    }));
    setPartySearch(`${party.company_name} [${party.ledger_number}]`);
    setShowSuggestions(false);
  };

  const handleSelectDest = (party) => {
    setDestPartyId(party.id);
    setDestSearch(`${party.company_name} [${party.ledger_number}]`);
    setShowDestSuggestions(false);
  };

  const resetFormState = () => {
    setForm({
      voucher_no: "Auto",
      voucher_date: toYYYYMMDD(new Date()),
      party_id: "",
      party_name: "",
      gst_no: "",
      address: "",
      pin: "",
      city: "",
      state: "",
      mobile: "",
      voucher_type: "thirdparty_payment",
      paid_amount: "",
      due_amount: "",
      total_amount: "",
      payment_type: "cash",
      bank_name: "",
      payment_mode: "upi",
      check_number: "",
      transactionType: "COD",
      remark: "",
    });

    setPartySearch("");
    setDestSearch("");
    setDestPartyId("");
    setEditVoucherId(null);
  };

  const handleSave = (submitType = "exit") => {
    if (!form.party_id) {
      showError("Please select Party Name");
      return;
    }
    if (!destPartyId) {
      showError("Please select Third Party");
      return;
    }
    if (form.party_id === destPartyId) {
      showError("party and Third party cannot be the same!");
      return;
    }

    const payload = {
      company_id: COMPANY_ID,
      voucher_date: form.voucher_date,
      narration: form.remark,
      party_id: form.party_id,
      dest_party_id: destPartyId,
      amount: form.paid_amount || 0,
      voucher_type: form.voucher_type,
      paid_amount: form.paid_amount,
      due_amount: calculatedDue,
      total_amount: form.total_amount,
      payment_type: form.voucher_type === "thirdparty_receipt" ? form.payment_type : null,
      bank_id: (form.voucher_type === "thirdparty_receipt" && form.payment_type === "bank") ? form.bank_name : null,
      payment_mode: (form.voucher_type === "thirdparty_receipt" && form.payment_type === "bank") ? form.payment_mode : null,
      check_number: (form.voucher_type === "thirdparty_receipt" && form.payment_type === "bank" && form.payment_mode === "check") ? form.check_number : null,
      transaction_type: form.voucher_type === "thirdparty_payment" ? form.transactionType : null,
    };

    if (mode === "edit") {
      updateThirdPartyJournal(editVoucherId, payload)
        .then((res) => {
          if (res.data?.success) {
            showSuccess("Third Party  Voucher updated successfully! ✅");
            resetFormState();
            setMode("list");
          }
        })
        .catch((err) => {
          showError(
            err.response?.data?.error || "Failed to update transaction",
          );
        });
    } else {
      createThirdPartyJournal(payload)
        .then((res) => {
          if (res.data?.success) {
            showSuccess("Third Party  Voucher saved successfully! ✅");
            resetFormState();
            if (submitType === "exit") {
              setMode("list");
            } else {
              fetchNextVoucher();
            }
          }
        })
        .catch((err) => {
          showError(err.response?.data?.error || "Failed to save transaction");
          console.log("error->>><<", err);
        });
    }
  };

  const handleEditClick = async (id) => {
    try {
      const res = await getJournalById(id);
      const header = res.data?.header;
      if (!header) return showError("Voucher data not found!");

      setEditVoucherId(id);
      setForm({
        voucher_no: header.voucher_no,
        voucher_date: header.voucher_date
          ? header.voucher_date.slice(0, 10)
          : toYYYYMMDD(new Date()),
        party_id: header.party_id || "",
        party_name: header.party_name || "",
        gst_no: header.gst_no || "",
        address: header.address || "",
        pin: header.pin || "",
        city: header.city || "",
        state: header.state || "",
        mobile: header.mobile || "",

        voucher_type: header.voucher_type ? header.voucher_type.toLowerCase() : "thirdparty_payment",
        paid_amount: header.paid_amount || header.amount || "",
        due_amount: header.due_amount || "",
        total_amount: header.total_amount || "",
        payment_type: header.payment_type || "cash",
        bank_name: header.bank_id || header.bank_name || "",
        payment_mode: header.payment_mode || "upi",
        check_number: header.check_number || "",
        transactionType: header.transaction_type || "COD",
        remark: header.narration || "",
      });

      setPartySearch(header.party_name ? `${header.party_name}` : "");
      setDestPartyId(header.dest_party_id || "");
      setDestSearch(header.dest_party_name ? `${header.dest_party_name}` : "");

      // Fetch outstanding dues
      if (header.party_id) {
        getPartyDues(header.party_id).catch(console.error);
      }

      setMode("edit");
    } catch (err) {
      showError("Error fetching voucher details");
      console.error(err);
    }
  };

  const handleDeleteClick = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this third-party voucher?",
      )
    )
      return;
    try {
      await deleteJournal(id);
      showSuccess("Voucher deleted successfully!");
      loadTableVouchers();
    } catch (err) {
      showError("Failed to delete voucher");
      console.error(err);
    }
  };

  // Filter table records by search query
  const searchedVouchers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return vouchers.filter((v) => {
      return (
        (v.voucher_no || "").toLowerCase().includes(q) ||
        (v.party_name || "").toLowerCase().includes(q) ||
        (v.dest_party_name || "").toLowerCase().includes(q)
      );
    });
  }, [vouchers, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(searchedVouchers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVouchers = useMemo(() => {
    return searchedVouchers.slice(startIndex, startIndex + itemsPerPage);
  }, [searchedVouchers, startIndex]);

  if (mode === "list") {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* HEADER */}
        <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">
              Third Party Vouchers
            </h3>
            <span className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {searchedVouchers.length} Records
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[260px]">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Voucher No / Party..."
                className="h-[38px] w-full border border-gray-300 rounded-md pl-10 pr-3 text-sm focus:outline-none focus:border-[#FF4200]"
              />
              <Search
                size={16}
                className="absolute left-3 top-[11px] text-gray-400"
              />
            </div>

            <button
              onClick={() => {
                resetFormState();
                setMode("create");
              }}
              className="h-[38px] w-full sm:w-auto px-5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold transition-all"
            >
              + Create Voucher
            </button>
          </div>
        </div>

        {/* REPORT TABLE */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left border">#</th>
                  <th className="px-4 py-3 text-left border">Voucher No</th>
                  <th className="px-4 py-3 text-left border">Date</th>
                  <th className="px-4 py-3 text-left border">Party Name</th>
                  <th className="px-4 py-3 text-left border">Third Party</th>
                  <th className="px-4 py-3 text-left border">Voucher Type</th>
                  <th className="px-4 py-3 text-right border">Amount</th>
                  <th className="px-4 py-3 text-left border">Narration</th>
                  <th className="px-4 py-3 text-center border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-gray-500">
                      Loading vouchers...
                    </td>
                  </tr>
                ) : searchedVouchers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="text-center py-12 text-gray-400"
                    >
                      No third party  vouchers found.
                    </td>
                  </tr>
                ) : (
                  paginatedVouchers.map((v, idx) => (
                    <tr
                      key={v.id}
                      className="border last:border-b-0 hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 border">{startIndex + idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 border">
                        {v.voucher_no}
                      </td>
                      <td className="px-4 py-3 border">
                        {formatDate(v.voucher_date)}
                      </td>
                      <td className="px-4 py-3 border">
                        {v.party_name || "-"}
                      </td>
                      <td className="px-4 py-3 border">
                        {v.dest_party_name || "-"}
                      </td>

                      <td className="px-4 py-3 border font-medium text-blue-600">
                        {v.voucher_type || v.transaction_type || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold border">
                        ₹ {Number(v.amount || v.paid_amount || 0).toFixed(2)}
                      </td>
                      <td
                        className="px-4 py-3 text-gray-600 border truncate max-w-[150px]"
                        title={v.narration}
                      >
                        {v.narration || "-"}
                      </td>
                      <td className="px-4 py-3 border text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="Edit"
                            onClick={() => handleEditClick(v.id)}
                            className="p-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDeleteClick(v.id)}
                            className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                <span className="font-semibold">
                  {Math.min(startIndex + itemsPerPage, searchedVouchers.length)}
                </span>{" "}
                of <span className="font-semibold">{searchedVouchers.length}</span> entries
              </div>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create/Edit Mode Layout
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* HEADER */}
      <div className="bg-white border rounded-xl shadow-sm p-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            resetFormState();
            setMode("list");
          }}
          className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
          {mode === "edit"
            ? "Edit Third Party Voucher"
            : "Third Party Voucher"}
        </div>
      </div>

      {/* ======= FORM CARD ======= */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        className="bg-white border rounded-xl shadow-sm mt-4 overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b bg-gray-50">
          <div>
            <span className="text-white px-4 py-2 rounded-md text-sm font-semibold bg-green-600">
              Journal
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="w-full sm:w-[140px]">
              <FloatingDatePicker
                label="Voucher Date"
                value={toDateObj(form.voucher_date)}
                onChange={(date) =>
                  setForm({ ...form, voucher_date: toYYYYMMDD(date) })
                }
                required
              />
            </div>

            <div className="w-full sm:w-[140px]">
              <FloatingInput
                label="Voucher No."
                value={form.voucher_no}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Fields container */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3">
            {/* Party Name Search (Source) */}
            <div className="lg:col-span-3 relative">
              <FloatingInput
                label="Party Name"
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setShowSuggestions(true);
                }}
                required
              />

              {showSuggestions && partySearch.trim() !== "" && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredParties.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      No party found
                    </div>
                  ) : (
                    filteredParties.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectSuggestion(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-none"
                      >
                        <div className="text-sm font-semibold text-gray-800">
                          {p.company_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {p.ledger_number}{" "}
                          {p.mobile_number
                            ? ` | Mobile: ${p.mobile_number}`
                            : ""}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <FloatingInput label="GST Number" value={form.gst_no} disabled />
            </div>

            <div className="lg:col-span-5">
              <FloatingInput label="Address" value={form.address} disabled />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput label="Pincode" value={form.pin} disabled />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput label="City" value={form.city} disabled />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput label="State" value={form.state} disabled />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput label="Contact No." value={form.mobile} disabled />
            </div>

            {/* Voucher Type */}
            <div className="lg:col-span-3">
              <FloatingSelect
                label="Voucher Type"
                value={form.voucher_type}
                onChange={(e) =>
                  setForm({ ...form, voucher_type: e.target.value })
                }
                required
              >
                <option value="thirdparty_payment">Thirdparty Payment</option>
                {/* <option value="thirdparty_receipt">Thirdparty Receipt</option> */}
              </FloatingSelect>
            </div>

            {/* Paid Amount */}
            <div className="lg:col-span-3">
              <FloatingInput
                label="Paid Amount"
                type="number"
                value={form.paid_amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    paid_amount: val,
                    total_amount: val,
                  }));
                }}
                required
              />
            </div>

            {/* Due Amount (Hidden as requested) */}

            {/* Total Amount */}
            <div className="lg:col-span-3">
              <FloatingInput
                label="Total Amount"
                type="number"
                value={form.total_amount}
                disabled
              />
            </div>

            {/* To Party autocomplete search box */}
            <div className="lg:col-span-4 relative">
              <FloatingInput
                label="Third Party"
                value={destSearch}
                onChange={(e) => {
                  setDestSearch(e.target.value);
                  setShowDestSuggestions(true);
                }}
                required
              />

              {showDestSuggestions && destSearch.trim() !== "" && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {destParties.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      No party found
                    </div>
                  ) : (
                    destParties.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectDest(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-none"
                      >
                        <div className="text-sm font-semibold text-gray-800">
                          {p.company_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {p.ledger_number}{" "}
                          {p.mobile_number
                            ? ` | Mobile: ${p.mobile_number}`
                            : ""}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Conditionally visible fields based on Voucher Type */}
            {form.voucher_type === "thirdparty_payment" && (
              <div className="lg:col-span-4">
                <FloatingSelect
                  label="Payment Form"
                  value={form.transactionType}
                  onChange={(e) =>
                    setForm({ ...form, transactionType: e.target.value })
                  }
                  required
                >
                  <option value="COD">COD</option>
                  <option value="Claim">Claim</option>
                  <option value="Damages">Damages</option>
                </FloatingSelect>
              </div>
            )}

            {form.voucher_type === "thirdparty_receipt" && (
              <>
                {/* Payment Type */}
                <div className="lg:col-span-2">
                  <FloatingSelect
                    label="Payment Type"
                    value={form.payment_type}
                    onChange={(e) =>
                      setForm({ ...form, payment_type: e.target.value })
                    }
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </FloatingSelect>
                </div>

                {/* If Payment Type is bank, show Bank Name and Payment Mode */}
                {form.payment_type === "bank" && (
                  <>
                    <div className="lg:col-span-3">
                      <FloatingSelect
                        label="Bank Name"
                        value={form.bank_name}
                        onChange={(e) =>
                          setForm({ ...form, bank_name: e.target.value })
                        }
                        required
                      >
                        <option value="">Select Bank</option>
                        {bankList
                          .filter((bank) => bank.status === "active")
                          .map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.bank_name}
                            </option>
                          ))}
                      </FloatingSelect>
                    </div>

                    <div className="lg:col-span-3">
                      <FloatingSelect
                        label="Payment Mode"
                        value={form.payment_mode}
                        onChange={(e) =>
                          setForm({ ...form, payment_mode: e.target.value })
                        }
                        required
                      >
                        <option value="upi">UPI</option>
                        <option value="check">Check</option>
                        <option value="debit card">Debit Card</option>
                      </FloatingSelect>
                    </div>

                    {/* If Payment Mode is check, show Check Number */}
                    {form.payment_mode === "check" && (
                      <div className="lg:col-span-4">
                        <FloatingInput
                          label="Check Number"
                          value={form.check_number}
                          onChange={(e) =>
                            setForm({ ...form, check_number: e.target.value })
                          }
                          required
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Narration */}
          <div className="pt-1">
            <FloatingTextarea
              label="Narration"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>

          {/* Bottom Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => handleSave("continue")}
              className="h-[40px] px-5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              {mode === "edit" ? "Update & Continue" : "Save & Continue"}
            </button>

            <button
              type="button"
              onClick={() => handleSave("exit")}
              className="h-[40px] px-5 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
            >
              {mode === "edit" ? "Update & Exit" : "Save & Exit"}
            </button>

            <button
              type="button"
              onClick={() => {
                resetFormState();
                setMode("list");
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
