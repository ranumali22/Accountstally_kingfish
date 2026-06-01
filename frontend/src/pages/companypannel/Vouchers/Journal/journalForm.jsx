import { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

import {
  createJournal,
  getVouchersByCompany,
  updateJournal,
  getJournalById,
  searchParty,
  getNextVoucherNumber,
  getBanks,
} from "../../../../api";

/* -------------------- Small UI Components -------------------- */
import { getGroups } from "../../../../api";
import { showError, showSuccess, showInfo } from "../../../../components/ui/alert/Alert";
import { toYYYYMMDD } from "../../../../utils/dateUtils";

const FloatingInput = ({
  label,
  required = false,
  value,
  onChange,
  disabled = false,
  placeholder = "",
  type = "text",
  error = false,
  helperText = "",
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

      {helperText && (
        <p
          className={`mt-1 text-xs ${error ? "text-red-500" : "text-gray-500"}`}
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

const FloatingSelect = ({
  label,
  required = false,
  value,
  onChange,
  options = [],
  error = false,
  children, // 👈 add this
}) => {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={onChange}
        className={`peer h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition
          ${error ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#FF4200]"}
        `}
      >
        <option value="" disabled hidden></option>

        {/* 👇 priority to children */}
        {children}

        {/* 👇 fallback to options prop */}
        {!children &&
          options.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
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
  error = false,
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

/* -------------------- Helpers -------------------- */

const toDateObj = (yyyy_mm_dd) => (yyyy_mm_dd ? new Date(yyyy_mm_dd) : null);
const money = (v) => Number(v || 0);

/* -------------------- Main Component -------------------- */

export default function JurnalVoucherForm({ voucherId, onClose }) {
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;
  const companyState = companyData.state || "";
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  // const editIdFromUrl = params.get("id");
  const COMPANY_ID = JSON.parse(localStorage.getItem("company_data"))?.id;
  const navigate = useNavigate();

  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [groups, setGroups] = useState([]);

  const [editVoucherId, setEditVoucherId] = useState(null);

  // const [submitType, setSubmitType] = useState("continue");

  const [partySearch, setPartySearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [paymentMode, setPaymentMode] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankList, setBankList] = useState([]);
  const [paymentType, setPaymentType] = useState("");

  const initialForm = {
    voucher_no: "",
    voucher_date: toYYYYMMDD(new Date()),
    party_id: "",
    party_name: "",
    gst_no: "",
    address: "",
    pin: "",
    city: "",
    state: "",
    mobile: "",

    group_id: "",
    group_name: "",

    itemName: "",

    payment_type: "", // 🔥
    amount: "", // 🔥 total
    paid: 0, // 🔥 paid
    due: 0, // 🔥 auto

    remark: "",
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!COMPANY_ID) return;
    if (editVoucherId) return; // edit mode me generate nahi karna

    const fetchNext = async () => {
      try {
        const res = await getNextVoucherNumber("JOURNAL_VOUCHER");

        if (res.data?.success) {
          setForm((prev) => ({
            ...prev,
            voucher_no: res.data.voucher_no,
          }));
        }
      } catch (err) {
        console.error("Failed to load journal number", err);
      }
    };

    fetchNext();
  }, [COMPANY_ID, editVoucherId]);

  useEffect(() => {
    if (!COMPANY_ID) return;

    loadVouchers();
    loadGroups(); // 👈 ADD THIS
  }, [COMPANY_ID]);

  useEffect(() => {
    if (!partySearch || !COMPANY_ID) {
      setLedgers([]);
      return;
    }

    searchParty({ q: partySearch, company_id: COMPANY_ID })
      .then((res) => setLedgers(res.data || []))
      .catch(console.error);
  }, [partySearch, COMPANY_ID]);

  const loadVouchers = async () => {
    const res = await getVouchersByCompany(COMPANY_ID);
    setVouchers(res.data || []);
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditVoucherId(null);
    setPartySearch("");
    setShowSuggestions(false);
  };

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

  const calcDue = useMemo(() => {
    const due = Number(form.amount || 0) - Number(form.paid || 0);
    return due < 0 ? 0 : due;
  }, [form.amount, form.paid]);

  const submitJournal = async (mode) => {
    if (!COMPANY_ID) return showError("Company not found");
    if (!form.party_id) return showError("Select Party");
    // if (!form.group_id) return showError("Select Group");
    if (!form.group_id || Number(form.group_id) <= 0)
      return showError("Select Group");
    if (!form.amount || Number(form.amount) <= 0)
      return showError("Enter Amount");

    const payload = {
      company_id: COMPANY_ID,
      voucher_no: form.voucher_no,
      voucher_date: form.voucher_date,
      narration: form.remark,
      party_id: form.party_id,
      group_ledger_id: Number(form.group_id),
      group_name: form.group_name,
      item_name: form.itemName,
      amount: Number(form.amount),
      paid: Number(form.paid || 0),

      // 🔥 IMPORTANT CHANGES
      payment_type: paymentType || "none",
      payment_mode:
        paymentType === "CASH"
          ? "CASH"
          : paymentType === "BANK"
            ? paymentMode
            : null,

      bank_id: paymentType === "BANK" ? bankName : null,
      cheque_number:
        paymentType === "BANK" && paymentMode === "CHEQUE"
          ? chequeNumber
          : null,
      cheque_date:
        paymentType === "BANK" && paymentMode === "CHEQUE"
          ? toYYYYMMDD(chequeDate)
          : null,
    };

    try {
      if (editVoucherId) {
        await updateJournal(editVoucherId, payload);
        showSuccess("Journal Updated ✅");
      } else {
        const res = await createJournal(payload);
        showSuccess("Journal Saved ✅");
      }

      if (mode === "continue") {
        const nextRes = await getNextVoucherNumber("JOURNAL_VOUCHER");

        if (nextRes.data?.success) {
          setForm({
            ...initialForm,
            voucher_no: nextRes.data.voucher_no,
          });

          setPartySearch("");
          setShowSuggestions(false);
        }

        return;
      }

      if (mode === "exit") {
        resetForm();
        onClose?.(); // list page
      }
    } catch (err) {
      console.error(err);
      showError(err?.response?.data?.error || "Something went wrong");
    }
  };

  useEffect(() => {
    if (!voucherId) return;

    console.log("Fetching Journal Data for ID:", voucherId);
    setEditVoucherId(voucherId);

    getJournalById(voucherId)
      .then((res) => {
        console.log("Journal Data Received:", res.data);
        const { header } = res.data;

        if (!header) {
          console.error("No header data found for journal", voucherId);
          return;
        }

        const pType = (header.payment_type || "").toUpperCase();

        // Safe Date Parsing
        let vDate = "";
        if (header.voucher_date) {
          try {
            vDate = typeof header.voucher_date === "string" 
              ? header.voucher_date.slice(0, 10) 
              : toYYYYMMDD(new Date(header.voucher_date));
          } catch (e) {
            console.error("Date parsing error", e);
            vDate = "";
          }
        }

        setForm({
          voucher_no: header.voucher_no || "",
          voucher_date: vDate,
          party_id: header.party_id || "",
          party_name: header.party_name || "",
          gst_no: header.gst_no || "",
          address: header.address || "",
          pin: header.pin || "",
          city: header.city || "",
          state: header.state || "",
          mobile: header.mobile || "",
          group_id: header.group_id || "",
          group_name: header.group_name || "",
          itemName: header.item_name || "",
          payment_type: pType,
          amount: header.amount || "",
          paid: header.paid || "",
          due: header.due || 0,
          remark: header.narration || "",
        });

        setPaymentType(pType);

        if (pType === "CASH") {
          setPaymentMode("CASH");
          setBankName("");
          setChequeNumber("");
          setChequeDate("");
        } else if (pType === "BANK") {
          setBankName(header.bank_id || "");
          setPaymentMode((header.payment_mode || "").toUpperCase());
          setChequeNumber(header.cheque_number || "");
          setChequeDate(header.cheque_date ? new Date(header.cheque_date) : "");
        } else {
          setPaymentMode("");
          setBankName("");
          setChequeNumber("");
          setChequeDate("");
        }

        const dispName = header.party_name || "";
        const dispId = header.ledger_number || header.party_id || "";
        setPartySearch(dispName ? `${dispName} [${dispId}]` : "");
      })
      .catch((err) => {
        console.error("Failed to fetch journal by ID", err);
        showError("Failed to load journal details");
      });
  }, [voucherId]);

  const loadGroups = async () => {
    try {
      const res = await getGroups();
      setGroups(res.data || []);
    } catch (err) {
      console.error("Failed to load groups", err);
    }
  };

  useEffect(() => {
    if (!companyId) return;

    const fetchBanks = async () => {
      try {
        const res = await getBanks(companyId);
        setBankList(res.data || []);
      } catch (err) {
        console.error("Bank fetch failed", err);
      }
    };

    fetchBanks();
  }, [companyId]);

  return (
    // 🔥 UI 100% same as yours
    <div className="max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="bg-white border rounded-xl shadow-sm p-3 flex items-center justify-between">
        {/* Back Button (Left) */}
        <button
          type="button"
          onClick={() => onClose?.()}
          className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
        >
          ← Back
        </button>

        {/* Center Title */}
        <div className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
          Journal Voucher
        </div>
      </div>

      {/* FORM */}

      {/* ======= FORM CARD ======= */}
      <form
        onSubmit={(e) => {
          e.preventDefault(); // 🔒 no default submit
        }}
        className="bg-white border rounded-xl shadow-sm mt-4 overflow-hidden"
      >
        {/* Top bar (Sales + Mode + Date) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b bg-gray-50">
          {/* LEFT SIDE */}
          <div>
            <span className="text-white px-4 py-2 rounded-md text-sm font-semibold bg-green-600">
              Journal
            </span>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Voucher Date */}
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
            {/* Voucher No */}

            <div className="w-full sm:w-[140px]">
              <FloatingInput
                label="Voucher No."
                value={form.voucher_no || "Auto"}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Party Fields */}
        <div className="p-4 space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-3 relative">
              <FloatingInput
                label="Party Name "
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setShowSuggestions(true);
                }}
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
                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
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
              <FloatingInput
                label="GST Number"
                value={form.gst_no}
                onChange={(e) => setForm({ ...form, gst_no: e.target.value })}
              />
            </div>

            <div className="lg:col-span-5">
              <FloatingInput
                label="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Pincode"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
              />
            </div>
            <div className="lg:col-span-3">
              <FloatingInput
                label="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Contact No."
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Item Name"
                value={form.itemName}
                onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              />
            </div>
            <div className="lg:col-span-4">
              <FloatingSelect
                label="Group Type"
                value={form.group_id}
                onChange={(e) => {
                  const g = groups.find((x) => x.id === Number(e.target.value));
                  setForm({
                    ...form,
                    group_id: g?.id || "",
                    group_name: g?.name || "",
                  });
                }}
                required
              >
                <option value="">Select Group</option>

                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </FloatingSelect>
            </div>

            <div className="lg:col-span-2">
              <FloatingInput
                label="Paid Amount"
                type="number"
                value={form.paid}
                onChange={(e) => setForm({ ...form, paid: e.target.value })}
                required
              />
            </div>

            <div
              className="lg:col-span-3
              "
            >
              <FloatingInput label="Due" disabled value={calcDue} />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Total Amount"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            {/* Payment Type */}
            <div className="lg:col-span-3">
              <FloatingSelect
                label="Payment Type"
                value={paymentType}
                onChange={(e) => {
                  const value = e.target.value;
                  setPaymentType(value);

                  // Reset dependent fields
                  if (value !== "BANK") {
                    setBankName("");
                    setPaymentMode("");
                    setChequeNumber("");
                    setChequeDate("");
                  }
                }}
                options={[
                  { value: "", label: "None" },
                  { value: "CASH", label: "Cash" },
                  { value: "BANK", label: "Bank" },
                ]}
              />
            </div>

            {/* Bank Name (Only if BANK selected) */}
            {paymentType === "BANK" && (
              <div className="lg:col-span-3">
                <FloatingSelect
                  label="Bank Name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  options={[
                    { value: "", label: "Select Bank" },
                    ...bankList.map((bank) => ({
                      value: bank.id,
                      label: bank.bank_name,
                    })),
                  ]}
                />
              </div>
            )}

            {/* Payment Mode (Only if BANK selected) */}
            {paymentType === "BANK" && (
              <div className="lg:col-span-3">
                <FloatingSelect
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentMode(value);

                    if (value !== "CHEQUE") {
                      setChequeNumber("");
                      setChequeDate("");
                    }
                  }}
                  options={[
                    { value: "", label: "Select Mode" },
                    { value: "UPI", label: "UPI" },
                    { value: "CHEQUE", label: "Cheque" },
                    { value: "DEBIT_CARD", label: "Debit Card" },
                    { value: "CREDIT_CARD", label: "Credit Card" },
                  ]}
                />
              </div>
            )}

            {/* Cheque Number (Only if Cheque selected) */}
            {paymentType === "BANK" && paymentMode === "CHEQUE" && (
              <div className="lg:col-span-3">
                <FloatingInput
                  label="Cheque Number"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                />
              </div>
            )}

            {/* Cheque Date (Only if Cheque selected) */}
            {paymentType === "BANK" && paymentMode === "CHEQUE" && (
              <div className="lg:col-span-3">
                <FloatingDatePicker
                  label="Cheque Date"
                  value={chequeDate}
                  onChange={(val) => setChequeDate(val)}
                />
              </div>
            )}
          </div>

          {/* Narration */}
          <div className="pt-1 ">
            <FloatingTextarea
              label="Narration"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>

          {/* Bottom Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t">
            {/* SAVE & CONTINUE */}
            <button
              type="button"
              onClick={() => submitJournal("continue")}
              className="h-[40px] px-5 rounded-md bg-blue-600 text-white text-sm font-semibold"
            >
              Save & Continue
            </button>

            {/* SAVE & EXIT */}
            <button
              type="button"
              onClick={() => submitJournal("exit")}
              className="h-[40px] px-5 rounded-md bg-green-600 text-white text-sm font-semibold"
            >
              Save & Exit
            </button>

            {/* CANCEL */}
            <button
              type="button"
              onClick={() => onClose?.()}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
