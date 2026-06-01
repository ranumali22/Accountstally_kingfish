import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  createContra,
  updateContra,
  getNextContraNumber,
  getBanks,
  getBankReport,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";

const FloatingInput = ({
  label,
  required = false,
  value,
  onChange,
  name,
  type = "text",
  readOnly = false,
  className = "",
}) => (
  <div className="relative w-full">
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder=" "
      className={`peer w-full h-[44px] rounded-[10px] px-[14px] text-sm bg-white outline-none border border-gray-800 focus:border-[#FF4200] ${className}`}
    />
    <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

const FloatingSelect = ({
  label,
  required = false,
  value,
  onChange,
  name,
  children,
}) => (
  <div className="relative w-full">
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="peer w-full h-[44px] rounded-[10px] px-[14px] text-sm bg-white outline-none border border-gray-800"
    >
      <option value="" hidden></option>
      {children}
    </select>

    <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

const FloatingTextarea = ({ label, value, onChange, name }) => (
  <div className="relative w-full">
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={3}
      placeholder=" "
      className="peer w-full rounded-[10px] px-[14px] py-2 text-sm bg-white border border-gray-800 resize-none"
    />

    <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2">
      {label}
    </label>
  </div>
);

function FloatingDatePicker({ label, value, onChange, required }) {
  return (
    <div className="relative">
      <DatePicker
        // selected={value}
        selected={value ? new Date(value) : null}
        onChange={onChange}
        dateFormat="dd/MM/yyyy"
        placeholderText=" "
        className="peer w-full h-[44px] rounded-[10px] px-[14px] text-sm bg-white border border-gray-800"
      />

      <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}

const formatBalance = (bal) => {
  if (bal === undefined || bal === null || bal === "") return "";
  const num = Number(bal);
  return num >= 0
    ? `${num.toLocaleString("en-IN")}`
    : `- ${Math.abs(num).toLocaleString("en-IN")}`;
};

const getBalanceColor = (bal) => {
  if (bal === undefined || bal === null || bal === "") return "";
  const num = Number(bal);
  return num >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold";
};

export default function ContraForm({ editData, onClose, refresh }) {
  const [loading, setLoading] = useState(false);
  const [voucherNo, setVoucherNo] = useState("");
  const [bankList, setBankList] = useState([]);
  const [bankBalances, setBankBalances] = useState({});

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData?.id;

  const [form, setForm] = useState({
    bank_id: "",
    to_bank_id: "",
    // transaction_date: null,
    transaction_date: new Date().toISOString().split("T")[0],
    amount: "",
    entry_type: "Dr",
    narration: "",
    account_no: "",
    holder_name: "",
    ifsc: "",
    branch: "",
    to_account_no: "",
  });

  useEffect(() => {
    if (!companyId) return;

    getBanks(companyId).then((res) => {
      setBankList(res.data?.data || res.data || []);
    });
  }, [companyId]);

  useEffect(() => {
    if (!editData) {
      getNextContraNumber().then((res) => {
        setVoucherNo(res.data.contra_no);
      });
    } else {
      setVoucherNo(editData.contra_no || "");
    }
  }, [editData]);

  useEffect(() => {
    if (!form.bank_id || bankBalances[form.bank_id] !== undefined) return;
    getBankReport({ bank_id: form.bank_id }).then((res) => {
      setBankBalances((prev) => ({ ...prev, [form.bank_id]: res?.data?.closingBalance ?? 0 }));
    }).catch(console.error);
  }, [form.bank_id]);

  useEffect(() => {
    if (!form.to_bank_id || bankBalances[form.to_bank_id] !== undefined) return;
    getBankReport({ bank_id: form.to_bank_id }).then((res) => {
      setBankBalances((prev) => ({ ...prev, [form.to_bank_id]: res?.data?.closingBalance ?? 0 }));
    }).catch(console.error);
  }, [form.to_bank_id]);

  useEffect(() => {
    if (!editData || bankList.length === 0) return;

    const selectedBank = bankList.find(
      (b) => b.id.toString() === editData.bank_id?.toString(),
    );

    const selectedToBank = bankList.find(
      (b) => b.id.toString() === editData.to_bank_id?.toString(),
    );

    setForm({
      bank_id: editData.bank_id || "",
      to_bank_id: editData.to_bank_id || "",
      transaction_date: editData.transaction_date || null,
      amount: editData.amount || "",
      // entry_type: editData.entry_type || "Dr",
      entry_type:
        editData.transfer_type === "bank_to_bank"
          ? "bank_to_bank"
          : editData.entry_type || "Dr",
      narration: editData.narration || "",

      // 🔥 FIX HERE
      account_no: selectedBank?.account_no || "",
      holder_name: selectedBank?.holder_name || "",
      ifsc: selectedBank?.ifsc || "",
      branch: selectedBank?.branch || "",

      to_account_no: selectedToBank?.account_no || "",
    });
  }, [editData, bankList]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "bank_id") {
      const selected = bankList.find((b) => b.id.toString() === value);

      setForm((prev) => ({
        ...prev,
        bank_id: value,
        account_no: selected?.account_no || "",
        holder_name: selected?.holder_name || "",
        ifsc: selected?.ifsc || "",
        branch: selected?.branch || "",
      }));

      return;
    }

    if (name === "to_bank_id") {
      const selected = bankList.find((b) => b.id.toString() === value);

      setForm((prev) => ({
        ...prev,
        to_bank_id: value,
        to_account_no: selected?.account_no || "",
      }));

      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();

    if (!form.transaction_date) {
      showError("Voucher Date is required");
      return;
    }

    if (!form.bank_id) {
      showError("Bank is required");
      return;
    }

    if (!form.amount) {
      showError("Amount is required");
      return;
    }

    if (form.entry_type === "bank_to_bank") {
      if (!form.to_bank_id) {
        showError("To Bank is required");
        return;
      }

      if (form.bank_id === form.to_bank_id) {
        showError("Both banks cannot be same");
        return;
      }
    }

    setLoading(true);

    try {
      const res = editData
        ? await updateContra(editData.contra_no, form)
        : await createContra(form);

      showSuccess(res?.data?.message || "Success");

      refresh?.();

      // =========================
      // ✅ SAVE & CONTINUE
      // =========================
      if (type === "continue") {
        setForm({
          bank_id: "",
          to_bank_id: "",
          // transaction_date: null,
          transaction_date: new Date().toISOString().split("T")[0],
          amount: "",
          entry_type: "Dr",
          narration: "",
          account_no: "",
          holder_name: "",
          ifsc: "",
          branch: "",
        });

        const next = await getNextContraNumber();
        setVoucherNo(next?.data?.contra_no || "");

        return; // ❗ IMPORTANT (yahi fix hai)
      }

      // =========================
      // ✅ SAVE & EXIT
      // =========================
      onClose?.(); // 👈 sirf exit me call hoga
    } catch (err) {
      console.error(err);

      showError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Server Error",
      );
    }
  };

  const handleDateChange = (date) => {
    const formattedDate = date ? date.toISOString().split("T")[0] : null;

    setForm((prev) => ({
      ...prev,
      transaction_date: formattedDate,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <form className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <div className="text-sm font-semibold text-gray-800">
            Contra Voucher
          </div>

          <div className="flex gap-4">
            <FloatingDatePicker
              label="Voucher Date"
              value={form.transaction_date}
              onChange={handleDateChange}
              required
            />

            <FloatingInput label="Voucher No." value={voucherNo} readOnly />
          </div>
        </div>

        <div className="p-6 grid grid-cols-12 gap-5">
          <div className="col-span-4 relative">
            {form.bank_id && bankBalances[form.bank_id] !== undefined && (
              <div className="absolute -top-5 right-1 text-xs text-gray-600">
                Avail. Bal: <span className={getBalanceColor(bankBalances[form.bank_id])}>{formatBalance(bankBalances[form.bank_id])}</span>
              </div>
            )}
            <FloatingSelect
              label="Bank"
              name="bank_id"
              value={form.bank_id}
              onChange={handleChange}
              required
            >
              {bankList.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank_name}
                </option>
              ))}
            </FloatingSelect>
          </div>


          <div className="col-span-4">
            <FloatingInput
              label="Account No"
              value={form.account_no}
              readOnly
            />
          </div>

          <div className="col-span-4">
            <FloatingInput label="Holder" value={form.holder_name} readOnly />
          </div>

          <div className="col-span-4">
            <FloatingInput label="IFSC" value={form.ifsc} readOnly />
          </div>

          <div className="col-span-4">
            <FloatingInput label="Branch" value={form.branch} readOnly />
          </div>

          <div className="col-span-4">
            <FloatingInput
              label="Amount"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-span-4">
            <FloatingSelect
              label="Entry Type"
              name="entry_type"
              value={form.entry_type}
              onChange={handleChange}
            >
     
              <option value="Cr">Deposit (CR)</option> ✅
              <option value="Dr">Withdrawal (DR)</option> ✅
              <option value="bank_to_bank">Bank to Bank</option>
            </FloatingSelect>
          </div>

          {form.entry_type === "bank_to_bank" && (
            <>
              <div className="col-span-4">
                <FloatingSelect
                  label="To Bank"
                  name="to_bank_id"
                  value={form.to_bank_id}
                  onChange={handleChange}
                  required
                >
                  {bankList.map((bank) => (
                    <option
                      key={bank.id}
                      value={bank.id}
                      disabled={form.bank_id === bank.id}
                    >
                      {bank.bank_name}
                    </option>
                  ))}
                </FloatingSelect>
              </div>



              {/* <div className="col-span-4">
                <FloatingInput
                  label="To Account No"
                  value={form.to_account_no}
                  readOnly
                />
              </div> */}
            </>
          )}

          <div className="col-span-12">
            <FloatingTextarea
              label="Narration"
              name="narration"
              value={form.narration}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={(e) => handleSubmit(e, "continue")}
            className="h-[40px] px-5 rounded-md bg-blue-600 text-white text-sm font-semibold"
          >
            Save & Continue
          </button>

          <button
            onClick={(e) => handleSubmit(e, "exit")}
            className="h-[40px] px-5 rounded-md bg-green-600 text-white text-sm font-semibold"
          >
            Save & Exit
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
