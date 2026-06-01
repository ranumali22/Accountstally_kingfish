import { useEffect, useState } from "react";
import { ArrowLeft, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import {
  getExpenseMasters,
  getExpenseTypesByMaster,
  searchParty,
  createParty,
  createExpense,
  updateExpense,
  getNextExpenseVoucher,
  getGroupsByCompany,
  getAllTax,
  getBanks,
} from "../../../api";
import DatePicker from "react-datepicker";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";
const FILE_BASE = import.meta.env.VITE_SERVER_URL;

const FloatingInput = ({
  label,
  required = false,
  value,
  onChange,
  type = "text",
  readOnly = false,
}) => {
  return (
    <div className="relative w-full">
      <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full h-[44px] rounded-[12px] px-3 text-sm outline-none border 
          ${readOnly ? "bg-gray-50 text-gray-700" : "bg-white"}
          border-gray-300 focus:border-[#FF4200]`}
      />
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
      <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <select
        value={value}
        onChange={onChange}
        className="w-full h-[44px] rounded-[12px] px-3 text-sm outline-none border border-gray-300 bg-white focus:border-[#FF4200]"
      >
        {children}
      </select>
    </div>
  );
};

const FloatingTextarea = ({ label, value, onChange, rows = 3 }) => {
  return (
    <div className="relative w-full">
      <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full rounded-[12px] px-3 py-2 text-sm outline-none border border-gray-300 bg-white resize-none focus:border-[#FF4200]"
      />
    </div>
  );
};

const FloatingDatePicker = ({ label, required = false, value, onChange }) => {
  return (
    <div className="relative w-full">
      {/* Floating Label */}
      <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-700 z-10">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Date Picker */}
      <DatePicker
        selected={value ? new Date(value) : null}
        onChange={(date) => onChange(date.toISOString().split("T")[0])}
        dateFormat="dd/MM/yyyy"
        placeholderText="dd/mm/yyyy"
        showPopperArrow={false}
        className="w-full h-[44px] rounded-[12px] px-3 text-sm outline-none border 
                   border-gray-300 bg-white focus:border-[#FF4200]"
      />
    </div>
  );
};

export default function ExpenseEntry({ editData, mode, onClose, onSuccess }) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";
  const navigate = useNavigate();

  /* ================= MASTER / TYPE ================= */
  const [masters, setMasters] = useState([]);
  const [types, setTypes] = useState([]);
  const [expenseMasterId, setExpenseMasterId] = useState("");
  const [expenseTypeId, setExpenseTypeId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [voucherNo, setVoucherNo] = useState("");
  // 🔥 ADD WITH OTHER FORM STATES
  const [documentFile, setDocumentFile] = useState(null);
  const [existingDocument, setExistingDocument] = useState(null);

  /* ================= PARTY ================= */
  const [partySearch, setPartySearch] = useState("");
  const [partyList, setPartyList] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState(null);

  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyGst, setPartyGst] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  /* ================= PARTY EXTRA ================= */
  const [partyCity, setPartyCity] = useState("");
  const [partyState, setPartyState] = useState("");
  const [partyPincode, setPartyPincode] = useState("");

  /* ================= FORM ================= */
  // const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [narration, setNarration] = useState("");

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;
  const [bankName, setBankName] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankList, setBankList] = useState([]);
  /* ================= GROUP ================= */
  const [expenseGroupId, setExpenseGroupId] = useState("");
  const [expenseGroups, setExpenseGroups] = useState([]);
  const [taxList, setTaxList] = useState([]);
  const [selectedTaxId, setSelectedTaxId] = useState("");
  const [taxPercent, setTaxPercent] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [billNumber, setBillNumber] = useState("");
  const [tdsPercent, setTdsPercent] = useState("");
  const [tdsAmount, setTdsAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("");
  const [rows, setRows] = useState([
    {
      expenseMasterId: "",
      expenseTypeId: "",
      expenseGroupId: "",
      amount: "",
      taxId: "",
      taxPercent: 0,
      taxAmount: 0,
      types: [], // 👈 ADD THIS
    },
  ]);
  /* ================= FETCH MASTERS ================= */
  useEffect(() => {
    getExpenseMasters().then((res) => setMasters(res.data || []));
  }, []);

  const addRow = () => {
    setRows([
      ...rows,
      {
        expenseMasterId: "",
        expenseTypeId: "",
        expenseGroupId: "",
        amount: "",
        taxId: "",
        taxPercent: 0,
        taxAmount: 0,
      },
    ]);
  };

  useEffect(() => {
    getAllTax()
      .then((res) => {
        setTaxList(res.data?.data || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!companyId) return;

    getGroupsByCompany(companyId)
      .then((res) => {
        console.log("GROUP API RESPONSE 👉", res.data); // 👈 ye zaroor dekho
        setExpenseGroups(res.data || []);
      })
      .catch(console.error);
  }, [companyId]);

  /* ================= FETCH TYPES ================= */
  useEffect(() => {
    if (!expenseMasterId) {
      setTypes([]);
      return;
    }
    getExpenseTypesByMaster(expenseMasterId).then((res) =>
      setTypes(res.data || []),
    );
  }, [expenseMasterId]);

  /* ================= PARTY SEARCH ================= */
  useEffect(() => {
    if (!partySearch || partySearch.length < 1 || !companyId) {
      setPartyList([]);
      return;
    }

    const t = setTimeout(() => {
      searchParty({ q: partySearch, company_id: companyId })
        .then((res) => setPartyList(res.data || []))
        .catch(console.error);
    }, 300);

    return () => clearTimeout(t);
  }, [partySearch, companyId]);

  useEffect(() => {
    if (!editData) return;

    console.log("DEBUG: Expense Edit Data Received ->", editData);
    setExpenseMasterId(editData.expense_master_id);
    setExpenseTypeId(editData.expense_type_id);
    setBillNumber(editData.bill_number || "");
    setSelectedPartyId(editData.party_id);
    setPartySearch(editData.party_name || "");
    setPartyName(editData.party_name || "");
    setPartyPhone(editData.party_phone || "");
    setPartyGst(editData.party_gst || "");
    setPartyAddress(editData.party_address || "");
    // 🔥🔥 ADD THIS
    setPartyCity(editData.city || "");
    setPartyState(editData.state || "");
    setPartyPincode(editData.pincode || "");
    setPaymentType(editData.payment_type || "");
    setPaymentMode(editData.payment_mode || "");
    setBankName(editData.bank_id || "");
    setChequeNumber(editData.cheque_number || "");
    setChequeDate(editData.cheque_date || "");

    // setAmount(editData.amount || "");
    setPaid(editData.paid || "");
    setDate(editData.date || new Date().toISOString().split("T")[0]);
    setNarration(editData.narration || "");
  }, [editData]);

  useEffect(() => {
    if (!editData) return;

    setVoucherNo(editData.voucher_number || "");
  }, [editData]);

  useEffect(() => {
    if (!editData?.document) return;

    if (editData.document.startsWith("http")) {
      setExistingDocument(editData.document);
    } else {
      setExistingDocument(`${FILE_BASE}/${editData.document}`);
    }
  }, [editData]);

  useEffect(() => {
    if (!editData) return;

    // setExpenseGroupId(editData.expense_group_id || "");
    setExpenseGroupId(
      editData.expense_group_id ? String(editData.expense_group_id) : "",
    );
  }, [editData]);

  /* ================= PARTY SELECT ================= */
  const selectParty = (p) => {
    setSelectedPartyId(p.id);
    setPartySearch(`${p.company_name} [${p.ledger_number}]`);
    setPartyName(p.company_name);
    setPartyPhone(p.mobile_number || "");
    setPartyGst(p.gst_number || "");
    setPartyAddress(p.address || "");
    // 🔥🔥 AUTO-FETCH LOCATION
    setPartyCity(p.city || "");
    setPartyState(p.state || "");
    setPartyPincode(p.pincode || "");
    setPartyList([]);
  };

  useEffect(() => {
    if (!editData || masters.length === 0) return;

    setExpenseMasterId(String(editData.expense_master_id));
  }, [editData, masters]);

  useEffect(() => {
    if (!editData || types.length === 0) return;

    setExpenseTypeId(String(editData.expense_type_id));
  }, [editData, types]);

  /* ================= CALC ================= */
  const paidAmt = Number(paid || 0);
  /* ================= SAVE ================= */

  const baseTotal = rows.reduce((sum, row) => {
    return sum + Number(row.amount || 0);
  }, 0);

  const grandTotal = rows.reduce((sum, row) => {
    const base = Number(row.amount || 0);

    const taxObj = taxList.find((t) => String(t.id) === String(row.taxId));

    const percent = Number(taxObj?.tax_percent || 0);
    const tax = (base * percent) / 100;

    return sum + base + tax;
  }, 0);

  const totals = rows.reduce(
    (acc, row) => {
      const base = Number(row.amount || 0);

      const taxObj = taxList.find((t) => String(t.id) === String(row.taxId));

      const percent = Number(taxObj?.tax_percent || 0);
      const tax = (base * percent) / 100;

      acc.base += base;
      acc.tax += tax;
      acc.grand += base + tax;

      return acc;
    },
    { base: 0, tax: 0, grand: 0 },
  );

  const dueAmount = useMemo(() => {
    const total = Number(totals.grand || 0);
    const paidAmt = Number(paid || 0);

    const due = total - paidAmt;

    return due < 0 ? 0 : due;
  }, [totals.grand, paid]);

  const handleSave = async () => {
    if (isSaving) return; // 🚫 double click block

    setIsSaving(true); // 🔄 start loading
    if (!partyName?.trim()) {
      showError("Please enter party name");
      setIsSaving(false);
      return;
    }

    if (rows.length === 0) {
      showError("Add at least one expense row");
      return;
    }

    for (let row of rows) {
      if (
        !row.expenseMasterId ||
        !row.expenseTypeId ||
        !row.expenseGroupId ||
        !row.amount
      ) {
        showError("Fill all row details properly");
        return;
      }
    }

    if (!paymentType) {
      showError("Please select payment type");
      return;
    }

    if (paidAmt < 0) {
      showError("Paid amount cannot be negative");
      return;
    }

    if (paidAmt > totals.grand) {
      showError("Paid amount cannot exceed total amount");
      return;
    }

    let partyId = selectedPartyId;

    try {
      // 🔥 AUTO CREATE PARTY
      if (!partyId) {
        const match = partyList.find(
          (p) =>
            p.company_name?.trim().toLowerCase() ===
              partyName.trim().toLowerCase() ||
            (partyGst && p.gst_number === partyGst) ||
            (partyPhone && p.mobile_number === partyPhone),
        );

        if (match) {
          partyId = match.id;
        } else {
          const res = await createParty({
            company_id: companyId,
            company_name: partyName,
            mobile_number: partyPhone,
            gst_number: partyGst,
            address: partyAddress,
            state: partyState,
            city: partyCity,
            pincode: partyPincode,
          });

          partyId = res.data.id;
        }
      }

      const formData = new FormData();

      formData.append("payment_type", paymentType);
      formData.append("party_id", partyId);
      formData.append("bill_number", billNumber);
      formData.append("tds_percent", Number(tdsPercent || 0));
      formData.append("tds_amount", Number(tdsAmount || 0));
      formData.append("rows", JSON.stringify(rows));
      formData.append("total_amount", totals.grand);
      formData.append("paid", paidAmt);
      formData.append("due", dueAmount);
      // 🔥 ADD THESE
      formData.append("payment_mode", paymentMode || "");
      formData.append("bank_id", bankName || "");
      formData.append("cheque_number", chequeNumber || "");
      formData.append("cheque_date", chequeDate || "");
      formData.append("expense_date", date);
      formData.append("narration", narration || "");

      if (documentFile) {
        formData.append("document", documentFile);
        formData.append("replace_document", "1");
      }

      if (editData) {
        await updateExpense(editData.id, formData);
        showSuccess("Expense updated successfully");
      } else {
        const res = await createExpense(formData);
        setVoucherNo(res.data.voucher_number);
        showSuccess("Expense saved successfully");
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      showError("Something went wrong");
    } finally {
      setIsSaving(false); // 🔄 always stop
    }
  };


  useEffect(() => {
    if (!editData?.rows) return;

    const loadRows = async () => {
      const formattedRows = await Promise.all(
        editData.rows.map(async (r) => {
          let typesData = [];

          if (r.expense_master_id) {
            const res = await getExpenseTypesByMaster(r.expense_master_id);
            typesData = res.data || [];
          }

          return {
            expenseMasterId: String(r.expense_master_id || ""),
            expenseTypeId: String(r.expense_type_id || ""),
            expenseGroupId: String(r.expense_group_id || ""),
            amount: r.amount || "",

            // 🔥 FIX HERE
            taxId: String(r.tax_id || r.taxId || ""),

            types: typesData,
          };
        }),
      );

      setRows(formattedRows);
    };

    loadRows();
  }, [editData]);

  useEffect(() => {
    if (editData) return; // EDIT mode skip

    getNextExpenseVoucher()
      .then((res) => {
        setVoucherNo(res.data.voucher_number);
      })
      .catch(console.error);
  }, [editData]);

  useEffect(() => {
    if (!editData) return;

    setTdsPercent(Number(editData.tds_percent || 0));
    setTdsAmount(Number(editData.tds_amount || 0));
  }, [editData]);

  useEffect(() => {
    if (mode === "add") {
      getNextExpenseVoucher()
        .then((res) => {
          setVoucherNo(res.data.voucher_number);
        })
        .catch(console.error);
    }
  }, [mode]);

  useEffect(() => {
    // Only calculate automatically if we have a taxable amount
    // or if the user is manually changing the percent.
    if (baseTotal > 0 && tdsPercent !== "") {
      const percent = Number(tdsPercent || 0);
      const taxableAmount = baseTotal;
      const tdsAmt = (taxableAmount * percent) / 100;
      setTdsAmount(Number(tdsAmt.toFixed(2)));
    }
  }, [tdsPercent, baseTotal]);

  const removeRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
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
    <div className="max-w-7xl mx-auto p-4">
      {/* TOP BAR */}
      <div className="bg-white border rounded-xl shadow-sm px-4 py-3 flex items-center justify-between mb-4">
        <button
          onClick={onClose}
          className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="font-semibold text-gray-800">Expense Voucher</div>

        <div />
      </div>

      <div className="bg-white border rounded-md overflow-hidden">
        {/* HEADER */}
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="px-3 py-1 rounded bg-green-600 text-white text-sm font-semibold">
              Expense
            </span>
          </div>

          <div className="flex items-center gap-5 w-[380px]">
            <FloatingDatePicker
              label="Expense Date"
              required
              value={date}
              onChange={setDate}
            />

            <div className="w-[440px]">
              <FloatingInput label="Voucher No." value={voucherNo} readOnly />
            </div>
            <div className="w-[340px]">
              <FloatingInput
                label="Bill Number"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                readOnly={isView}
              />
            </div>
          </div>
        </div>

        {/* PARTY SECTION */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3">
            {/* Party Name */}
            <div className="lg:col-span-3 relative">
              <FloatingInput
                label="Party Name"
                required
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setPartyName(e.target.value);
                  setSelectedPartyId(null);
                }}
                readOnly={isView}
              />

              {partyList.length > 0 && !isView && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-52 overflow-auto">
                  {partyList.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectParty(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="font-semibold text-sm">
                        {p.company_name} [{p.ledger_number}]
                      </div>
                      <div className="text-xs text-gray-500">
                        📞 {p.mobile_number || "-"} | {p.state || "-"} |{" "}
                        {p.city || "-"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile */}
            <div className="lg:col-span-3">
              <FloatingInput
                label="Mobile Number"
                value={partyPhone}
                onChange={(e) => {
                  const onlyNumbers = e.target.value.replace(/\D/g, ""); // non-digit remove
                  if (onlyNumbers.length <= 10) {
                    setPartyPhone(onlyNumbers);
                  }
                }}
                readOnly={isView}
                type="tel"
              />
            </div>

            {/* GST */}
            <div className="lg:col-span-3">
              <FloatingInput
                label="GST Number"
                value={partyGst}
                onChange={(e) => setPartyGst(e.target.value.toUpperCase())}
                readOnly={isView}
              />
            </div>

            {/* City */}
            <div className="lg:col-span-3">
              <FloatingInput
                label="City"
                value={partyCity}
                onChange={(e) => setPartyCity(e.target.value)}
                readOnly={isView}
              />
            </div>

            {/* State */}
            <div className="lg:col-span-3">
              <FloatingInput
                label="State"
                value={partyState}
                onChange={(e) => setPartyState(e.target.value)}
                readOnly={isView}
              />
            </div>

            {/* Pincode */}
            <div className="lg:col-span-3">
              <FloatingInput
                label="Pincode"
                value={partyPincode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (v.length <= 6) setPartyPincode(v);
                }}
                readOnly={isView}
              />
            </div>

            {/* Address */}
            <div className="lg:col-span-6">
              <FloatingInput
                label="Address"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                readOnly={isView}
              />
            </div>
          </div>
        </div>

        {/* EXPENSE TABLE */}
        <div className="border-t">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="border p-2 w-12 text-center">Sr</th>
                  <th className="border p-2 text-left">Expense Head</th>
                  <th className="border p-2 text-left">Expense Type</th>
                  <th className="border p-2 text-left">Expense Group</th>
                  <th className="border p-2 text-right w-[150px]">Amount</th>
                  <th className="border p-2 text-center w-[240px]">Tax</th>
                  <th className="border p-2 text-right w-[150px]">Total</th>
                  <th className="border p-2 text-center w-[80px]">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const baseAmount = Number(row.amount || 0);
                  const taxObj = taxList.find(
                    (t) => String(t.id) === String(row.taxId),
                  );
                  const taxPercent = Number(taxObj?.tax_percent || 0);
                  const taxAmount = (baseAmount * taxPercent) / 100;
                  const rowTotal = baseAmount + taxAmount;

                  return (
                    <tr key={index}>
                      <td className="border p-2 text-center">{index + 1}</td>

                      {/* Expense Head */}
                      <td className="border p-2">
                        <select
                          value={row.expenseMasterId}
                          onChange={async (e) => {
                            const masterId = e.target.value;

                            const newRows = [...rows];
                            newRows[index].expenseMasterId = masterId;
                            newRows[index].expenseTypeId = ""; // reset type
                            newRows[index].types = [];

                            setRows(newRows);

                            if (masterId) {
                              const res =
                                await getExpenseTypesByMaster(masterId);
                              const typesData = res.data || [];

                              const updatedRows = [...newRows];
                              updatedRows[index].types = typesData;
                              setRows(updatedRows);
                            }
                          }}
                          className="h-9 w-full border rounded px-2 bg-white"
                        >
                          <option value="">Select</option>
                          {masters.map((m) => (
                            <option key={m.id} value={String(m.id)}>
                              {m.expense_master}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Expense Type */}
                      <td className="border p-2">
                        <select
                          value={row.expenseTypeId}
                          onChange={(e) => {
                            const newRows = [...rows];
                            newRows[index].expenseTypeId = e.target.value;
                            setRows(newRows);
                          }}
                          className="h-9 w-full border rounded px-2 bg-white"
                        >
                          <option value="">Select</option>
                          {row.types?.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                              {t.expense_type}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Expense Group */}
                      <td className="border p-2">
                        <select
                          value={row.expenseGroupId}
                          onChange={(e) => {
                            const newRows = [...rows];
                            newRows[index].expenseGroupId = e.target.value;
                            setRows(newRows);
                          }}
                          className="h-9 w-full border rounded px-2 bg-white"
                        >
                          <option value="">Select</option>
                          {expenseGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Amount */}
                      <td className="border p-2 text-right">
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => {
                            const newRows = [...rows];
                            newRows[index].amount = e.target.value;
                            setRows(newRows);
                          }}
                          className="h-9 w-full border rounded px-2 text-right"
                        />
                      </td>

                      {/* Tax */}
                      <td className="border p-2">
                        <div className="flex items-center justify-center gap-2">
                          <select
                            value={row.taxId}
                            onChange={(e) => {
                              const newRows = [...rows];
                              newRows[index].taxId = e.target.value;
                              setRows(newRows);
                            }}
                            className="h-9 w-[120px] border rounded px-2 bg-white text-xs"
                          >
                            <option value="">None</option>
                            {taxList.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.tax_name}
                              </option>
                            ))}
                          </select>

                          <input
                            value={taxAmount.toFixed(2)}
                            readOnly
                            className="h-9 w-[90px] text-center border rounded px-2 bg-gray-50"
                          />
                        </div>
                      </td>

                      {/* Total */}
                      <td className="border p-2 text-right font-semibold">
                        {rowTotal.toFixed(2)}
                      </td>

                      {/* Remove Button */}
                      <td className="border p-2 text-center">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-red-600 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* ADD ROW */}
                <tr>
                  <td colSpan={8} className="border p-3">
                    <button
                      type="button"
                      onClick={addRow}
                      className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
                    >
                      + ADD ROW
                    </button>
                  </td>
                </tr>

                {/* TOTAL ROW */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="border p-2" colSpan={4}>
                    TOTAL
                  </td>

                  {/* BASE TOTAL */}
                  <td className="border p-2 text-right">
                    {totals.base.toFixed(2)}
                  </td>

                  {/* TAX TOTAL */}
                  <td className="border p-2 text-right">
                    {totals.tax.toFixed(2)}
                  </td>

                  {/* GRAND TOTAL */}
                  <td className="border p-2 text-right">
                    {totals.grand.toFixed(2)}
                  </td>

                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYMENT SUMMARY */}
        <div className="p-4">
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-4">
            {/* ✅ TDS Percent */}
            <div className="md:col-span-3">
              <FloatingInput
                label="TDS %"
                value={tdsPercent}
                onChange={(e) => setTdsPercent(e.target.value)}
                type="number"
              />
            </div>

            {/* ✅ TDS Amount */}
            <div className="md:col-span-3">
              <FloatingInput
                label="TDS Amount"
                value={Number(tdsAmount || 0).toFixed(2)}
                onChange={() => {}}
                type="text"
                readOnly
              />
            </div>
            {/* Paid Amount */}
            <div className="md:col-span-3">
              <FloatingInput
                label="Paid Amount"
                type="number"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
              />
            </div>

            {/* Due */}
            <div className="md:col-span-3">
              <FloatingInput
                label="Due"
                value={dueAmount.toFixed(2)}
                readOnly
              />
            </div>

            {/* Total */}
            <div className="md:col-span-3">
              <FloatingInput
                label="Total"
                value={totals.grand.toFixed(2)}
                onChange={() => {}}
                type="text"
                readOnly
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

                  if (value !== "BANK") {
                    setBankName("");
                    setPaymentMode("");
                    setChequeNumber("");
                    setChequeDate("");
                  }
                }}
              >
                <option value="">Select</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
              </FloatingSelect>
            </div>

            {/* Bank Name (Only if BANK selected) */}
            {paymentType === "BANK" && (
              <div className="lg:col-span-3">
                <FloatingSelect
                  label="Bank Name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
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
                >
                  <option value="">Select Mode</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </FloatingSelect>
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
        </div>

        {/* NARRATION */}
        <div className="p-4 border-t">
          <FloatingTextarea
            label="Narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            rows={3}
          />
        </div>

        {/* ACTION AREA */}
        <div className="p-4 border-t flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Upload */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDocumentFile(file);
                  setExistingDocument(null);
                }}
              />

              <div className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm font-semibold flex items-center gap-2">
                <Upload size={16} />
                Upload Expense Bill
              </div>
            </label>

            {(documentFile || existingDocument) && (
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-gray-50">
                <div className="text-sm">
                  <div className="font-semibold text-gray-800">
                    {documentFile ? documentFile.name : "Existing Expense Bill"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDocumentFile(null);
                    setExistingDocument(null);
                  }}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {/* CANCEL */}
            <button
              onClick={onClose}
              disabled={isSaving}
              className={`px-5 py-2 border rounded 
      ${isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}
    `}
            >
              Cancel
            </button>

            {/* SAVE / UPDATE */}
            {!isView && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-5 py-2 rounded text-white flex items-center gap-2
        ${
          isSaving
            ? "bg-blue-300 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }
      `}
              >
                {/* 🔄 Spinner */}
                {isSaving && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                )}

                {/* Text */}
                {isSaving
                  ? "Saving..."
                  : isEdit
                    ? "Update Expense"
                    : "Save Expense"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
