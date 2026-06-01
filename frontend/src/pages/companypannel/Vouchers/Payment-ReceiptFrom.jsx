import { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  createVoucher,
  updateVoucher,
  getVouchersByCompany,
  getPartyWithDues, // 🔥 changed
  cancelVoucher,
  getVoucherById,
  getNextVoucherNumber,
  getBanks,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";
import { toYYYYMMDD } from "../../../utils/dateUtils";

/* -------------------- Small UI Components -------------------- */

const FloatingInput = ({
  label,
  required = false,
  value,
  onChange,
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
  children,
}) => {
  return (
    <div className="relative w-full">


      <select
        value={value || ""}
        onChange={onChange}
        className="peer h-11 w-full rounded-md border bg-white px-3 text-sm outline-none"
      >
        <option value="">Select {label}</option>

        {children}

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
        className="h-10 border rounded px-3 text-sm outline-none focus:outline-none focus:ring-0"
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

export default function PaymentReceiptForm() {
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;
  const companyState = companyData.state || "";
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const editIdFromUrl = params.get("id");
  const COMPANY_ID = JSON.parse(localStorage.getItem("company_data"))?.id;
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [editVoucherId, setEditVoucherId] = useState(null);
  const [submitType, setSubmitType] = useState("continue");
  const [partySearch, setPartySearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const initialForm = {
    voucher_type: "RECEIPT",
    voucher_no: "",
    voucher_date: toYYYYMMDD(new Date()),

    party_ledger_id: "",
    party_id: "",

    party_name: "",
    gst_no: "",
    address: "",
    pin: "",
    city: "",
    state: "",
    mobile: "",

    total_dues: 0,
    due: 0,

    payment_amount: "",

    remark: "",
  };

  const [form, setForm] = useState(initialForm);
  const [paymentMode, setPaymentMode] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [bankList, setBankList] = useState([]);

  useEffect(() => {
    if (!COMPANY_ID) return;
    if (editVoucherId) return; // edit mode me old number hi dikhe

    const fetchNextNumber = async () => {
      try {
        const res = await getNextVoucherNumber(
          form.voucher_type, // RECEIPT / PAYMENT
        );

        if (res.data?.success) {
          setForm((prev) => ({
            ...prev,
            voucher_no: res.data.voucher_no,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch voucher number", err);
      }
    };

    fetchNextNumber();
  }, [COMPANY_ID, form.voucher_type, editVoucherId]);

  useEffect(() => {
    if (!COMPANY_ID) return;
    loadLedgers();
    loadVouchers();
  }, [COMPANY_ID]);

  const loadLedgers = async () => {
    const res = await getPartyWithDues(); // 🔥 changed
    setLedgers(res.data || []);
  };

  const loadVouchers = async () => {
    const res = await getVouchersByCompany();
    setVouchers(res.data || []);
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditVoucherId(null);
    setPartySearch("");
    setShowSuggestions(false);
    setPaymentType("");
    setPaymentMode("");
    setBankName("");
    setChequeNumber("");
    setChequeDate("");
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
    const totalDues =
      form.voucher_type === "PAYMENT"
        ? Number(party.purchase_due || 0)
        : Number(party.sales_due || 0);

    setForm((prev) => ({
      ...prev,
      party_ledger_id: party.id,
      party_id: party.id,

      party_name: party?.company_name || "",
      mobile: party?.mobile_number || "",
      gst_no: party?.gst_number || "",
      address: party?.address || "",
      pin: party?.pincode || "",
      city: party?.city || "",
      state: party?.state || "",

      total_dues: totalDues,
      due: totalDues, // 🔥 IMPORTANT FIX
      payment_amount: "",
      remark: "",
    }));

    setPartySearch(`${party.company_name} [${party.ledger_number}]`);
    setShowSuggestions(false);
  };

  const calcDue = useMemo(() => {
    return Math.max(
      Number(form.total_dues || 0) - Number(form.payment_amount || 0),
      0,
    );
  }, [form.total_dues, form.payment_amount]);

  const submitVoucher = async (e) => {
    e.preventDefault();

    if (!COMPANY_ID) return showError("Company ID not found!");
    if (!form.party_ledger_id) return showError("Select Party");
    if (!form.payment_amount || Number(form.payment_amount) <= 0)
      return showError("Enter Payment Amount");

    if (!paymentType) {
      return showError("Select Payment Type");
    }

    if (paymentType === "BANK" && !bankName) {
      return showError("Select Bank");
    }

    if (paymentType === "BANK" && !paymentMode) {
      return showError("Select Payment Mode");
    }

    if (paymentType === "BANK" && paymentMode === "CHEQUE") {
      if (!chequeNumber) return showError("Enter Cheque Number");
      if (!chequeDate) return showError("Select Cheque Date");
    }

    const amount = Number(form.payment_amount);

    let entries = [];
    if (form.voucher_type === "PAYMENT") {
      entries = [{ party_id: form.party_id, debit: amount, credit: 0 }];
    } else {
      entries = [{ party_id: form.party_id, debit: 0, credit: amount }];
    }

    const payload = {
      company_id: COMPANY_ID,
      voucher_type: form.voucher_type,
      voucher_no: form.voucher_no,
      voucher_date: form.voucher_date,

      party_ledger_id: form.party_ledger_id,
      party_id: form.party_id,

      party_name: form.party_name,
      gst_no: form.gst_no,
      address: form.address,
      pin: form.pin,
      city: form.city,
      state: form.state,
      mobile: form.mobile,

      total_dues: form.total_dues,

      payment_amount: amount,

      // 🔥 PAYMENT FIELDS ADD KARO
      payment_type: paymentType || null,
      payment_mode: paymentType === "BANK" ? paymentMode : null,
      // bank_name: paymentType === "BANK" ? bankName : null,
      bank_id: paymentType === "BANK" ? bankName : null,
      cheque_number:
        paymentType === "BANK" && paymentMode === "CHEQUE"
          ? chequeNumber
          : null,
      cheque_date:
        paymentType === "BANK" && paymentMode === "CHEQUE" ? chequeDate : null,

      remark: form.remark,

      entries,
    };

    if (editVoucherId) {
      await updateVoucher(editVoucherId, payload);
      showSuccess("Voucher Updated ✅");
      navigate("/voucher/list");
      return;
    }

    // 🔥 CREATE MODE
    await createVoucher(payload);
    showSuccess("Voucher Saved ✅");

    await loadVouchers();
    await loadLedgers();

    if (submitType === "exit") {
      navigate("/voucher/list");
      return;
    }

    // 🔥 CONTINUE MODE → fetch next number
    const nextRes = await getNextVoucherNumber(form.voucher_type);

    if (nextRes.data?.success) {
      setForm({
        ...initialForm,
        voucher_type: form.voucher_type,
        voucher_no: nextRes.data.voucher_no,
      });
      setPartySearch("");
      await loadLedgers();
    }
  };

  useEffect(() => {
    if (!editIdFromUrl) return;

    setEditVoucherId(editIdFromUrl);

    (async () => {
      const res = await getVoucherById(editIdFromUrl);
      const v = res.data?.voucher;

      if (!v) return;

      const totalDues = Number(v.total_dues || 0);
      const paid = Number(v.payment_amount || 0); // ✅ fixed
      const due = Math.max(totalDues - paid, 0);

      setForm({
        voucher_type: v.voucher_type,
        voucher_no: v.voucher_no || "",
        voucher_date: v.voucher_date ? new Date(v.voucher_date) : null, // ✅ fixed

        party_ledger_id: v.party_id,
        party_id: v.party_id,

        party_name: v.party_name || "",
        gst_no: v.gst_no || "",
        address: v.address || "",
        pin: v.pin || "",
        city: v.city || "",
        state: v.state || "",
        mobile: v.mobile || "",

        total_dues: Number(totalDues || 0),
        due: Number(totalDues || 0),
        payment_amount: paid,

        payment_mode: v.payment_mode || "Cash",
        remark: v.remark || "",
      });

      // 🔥 Load payment fields in edit mode
      setPaymentType(v.payment_type || "");
      setPaymentMode(v.payment_mode || "");
      // setBankName(v.bank_name || "");
      setBankName(v.bank_id || "");
      setChequeNumber(v.cheque_number || "");
      setChequeDate(v.cheque_date || "");

      setPartySearch(`${v.party_name} [${v.party_id}]`);
    })();
  }, [editIdFromUrl]);

  useEffect(() => {
    if (!companyId) return;

    const fetchBanks = async () => {
      try {
        const res = await getBanks();
        setBankList(res.data || []);
      } catch (err) {
        console.error("Bank fetch failed", err);
      }
    };

    fetchBanks();
  }, [companyId]);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="bg-white border rounded-xl shadow-sm p-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
        >
          ← Back
        </button>

        <div className="text-sm font-semibold text-gray-800">
          {form.voucher_type === "PAYMENT"
            ? "Payment Voucher "
            : "Receipt Voucher "}
        </div>

        <button
          onClick={() =>
            setForm((p) => {
              const isPayment = p.voucher_type === "PAYMENT";
              const party = ledgers.find((l) => l.id === p.party_id);

              const newType = isPayment ? "RECEIPT" : "PAYMENT";

              const totalDues = party
                ? newType === "PAYMENT"
                  ? Number(party.purchase_due || 0)
                  : Number(party.sales_due || 0)
                : 0;

              return {
                ...p,
                voucher_type: newType,
                total_dues: totalDues,
                payment_amount: "",
              };
            })
          }
          className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Change Mode
        </button>
      </div>

      {/* FORM */}

      {/* ======= FORM CARD ======= */}
      <form
        onSubmit={submitVoucher}
        className="bg-white border rounded-xl shadow-sm mt-4 overflow-hidden"
      >
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`text-white px-3 py-1 rounded-md text-sm font-semibold
              ${form.voucher_type === "PAYMENT" ? "bg-blue-600" : "bg-green-600"}`}
            >
              {form.voucher_type === "PAYMENT" ? "Payment" : "Receipt"}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <FloatingDatePicker
              label="Voucher Date"
              value={toDateObj(form.voucher_date)}
              onChange={(date) =>
                setForm({ ...form, voucher_date: toYYYYMMDD(date) })
              }
              required
            />

            {/* 🔥 AUTO INVOICE */}
            <div className="">
              <FloatingInput
                label="Voucher No."
                value={form.voucher_no || "Auto"}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Party Fields */}
        <div className="p-4 space-y-3">
          {/* Row 1 */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 relative">
              <FloatingInput
                label="Party Name"
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
                          Ledger: {p.ledger_number}{" "}
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

            <div className="lg:col-span-3">
              <FloatingInput
                label="GST Number"
                value={form.gst_no}
                onChange={(e) => setForm({ ...form, gst_no: e.target.value })}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            {/* Row 2 */}
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
            {/* Payment Details Row */}
            <div className="lg:col-span-3">
              <FloatingSelect
                label="Voucher Type"
                value={form.voucher_type}
                onChange={(e) =>
                  setForm({ ...form, voucher_type: e.target.value })
                }
              >
                <option value="PAYMENT">Payment</option>
                <option value="RECEIPT">Receipt</option>
              </FloatingSelect>
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Paid Amount"
                type="number"
                value={form.payment_amount}
                onChange={(e) =>
                  setForm({ ...form, payment_amount: e.target.value })
                }
                required
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Due"
                value={calcDue}
                onChange={() => { }}
                readOnly
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Total"
                value={Number(form.total_dues || 0)}
                onChange={() => { }}
                readOnly
              />
            </div>

            {/* Payment Type */}
            <div className="lg:col-span-3">
              <FloatingSelect
                label="Payment Type"
                required
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
                    ...bankList.filter((bank) => bank.status === "active").map((bank) => ({
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
                  value={chequeDate ? new Date(chequeDate) : null}
                  onChange={(val) => setChequeDate(toYYYYMMDD(val))}
                />
              </div>
            )}
          </div>

          {/* Narration */}
          <div className="p-4">
            <FloatingTextarea
              label="Narration"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>

          {/* Bottom Buttons */}
          <div
            className="p-4 border-t 
             flex flex-col sm:flex-row 
               sm:justify-end gap-3"
          >
            <button
              type="submit"
              onClick={() => setSubmitType("continue")}
              className="h-[40px] px-5 rounded-md bg-blue-600 text-white text-sm font-semibold"
            >
              Save & Continue
            </button>

            <button
              type="submit"
              onClick={() => setSubmitType("exit")}
              className="h-[40px] px-5 rounded-md bg-green-600 text-white text-sm font-semibold"
            >
              Save & Exit
            </button>

            <button
              type="button"
              onClick={() => navigate("/Voucher/list")}
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
