import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  searchParty,
  createTaxDuty,
  getTaxDuties,
  getTaxDutyById,
  updateTaxDuty,
  deleteTaxDuty,
  getDutiesGroups,
  getBanks,
  getTdsInvoicesByParty,
  getPurchaseInvoicesByParty,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";

/* FLOATING COMPONENTS (UNCHANGED) */

const DateInput = React.forwardRef(({ value, onClick, className }, ref) => (
  <input
    ref={ref}
    value={value}
    onClick={onClick}
    readOnly
    className={className}
  />
));

const FloatingDatePicker = ({ label, required, value, onChange }) => (
  <div className="relative w-full">
    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-600 z-10">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <DatePicker
      selected={value ? new Date(value) : null}
      onChange={(date) => onChange(date.toISOString().slice(0, 10))}
      dateFormat="dd/MM/yyyy"
      customInput={
        <DateInput
          className="
          w-full h-[44px]
          border border-gray-300
          rounded-lg
          px-3
          text-sm
          bg-white
          shadow-sm
          focus:outline-none
        
          focus:ring-[#C4932B]
          focus:border-[#C4932B]
          "
        />
      }
    />
  </div>
);

const FloatingInput = ({
  label,
  required,
  value,
  onChange,
  readOnly,
  type = "text",
}) => (
  <div className="relative w-full">
    <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-gray-600">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      readOnly={readOnly}
      className="
      w-full h-[44px]
      border border-gray-300
      rounded-lg
      px-3
      text-sm
      bg-white
      shadow-sm
      focus:outline-none
      
          focus:ring-[#C4932B]
          focus:border-[#C4932B]
      transition
      "
    />
  </div>
);

const FloatingSelect = ({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
}) => (
  <div className="relative w-full">
    <select
      value={value || ""}
      onChange={onChange}
      className="
      w-full h-[44px]
      border border-gray-300
      rounded-md
      px-3 pt-2
      text-sm
      bg-white
      shadow-sm
      focus:outline-none    
          focus:ring-[#C4932B]
          focus:border-[#C4932B]
     
      "
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}

      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>

    <span className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-600 font-medium z-10">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
  </div>
);

/* MAIN */

export default function TdsForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id_param = params.get("id");
  const isEdit = !!id_param;
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  /* STATES */

  const [debitNoteNo, setDebitNoteNo] = useState("");
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [partySearch, setPartySearch] = useState("");
  const [partyList, setPartyList] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [partyGst, setPartyGst] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyCity, setPartyCity] = useState("");
  const [partyState, setPartyState] = useState("");
  const [partyPincode, setPartyPincode] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [invoiceList, setInvoiceList] = useState([]);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [groupList, setGroupList] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [narration, setNarration] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [taxList, setTaxList] = useState([]);
  const [paymentType, setPaymentType] = useState("");
  const [bankName, setBankName] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankList, setBankList] = useState([]);

  const [rows, setRows] = useState([
    {
      item: "",
      hsn: "",
      rate: 0,
      taxType: "",
      taxPercent: 0,
      taxAmount: 0,
      amount: 0,
    },
  ]);

  useEffect(() => {
    getDutiesGroups(companyId).then((res) => {
      const list = (res.data || []).map((g) => ({
        value: g.id,
        label: g.name,
      }));

      setGroupList(list);
    });
  }, []);

  /* LOAD EDIT */

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getTaxDutyById(id_param);
        const data = res.data;

        setVoucherDate(data.transaction_date || "");
        setPartySearch(data.party_name || "");
        setSelectedPartyId(data.party_id);
        setSelectedGroup(data.group_id);
        setTdsAmount(data.tds || 0);
        setSelectedInvoice(data.purchase_invoice_no || "ALL");
        setPaymentType(data.payment_type || "");
        setBankName(data.bank_name || "");
        setPaymentMode(data.payment_mode || "");
        setChequeNumber(data.cheque_number || "");
        setChequeDate(data.cheque_date || "");
        setNarration(data.narration || "");

        // Load Party Details
        if (data.party_id) {
          const partyRes = await searchParty({
            q: data.party_name,
            company_id: companyId,
          });
          const party = partyRes.data.find((p) => p.id === data.party_id);
          if (party) {
            setPartyGst(party.gst_number || "");
            setPartyAddress(party.address || "");
            setPartyCity(party.city || "");
            setPartyState(party.state || "");
            setPartyPincode(party.pincode || "");
            setPartyPhone(party.mobile_number || "");
          }

          // Load Invoices
          const invRes = await getTdsInvoicesByParty(companyId, data.party_id);
          const invoices = invRes?.data?.data || invRes?.data || [];
          const pending = invoices.filter((i) => i.paid_status !== "PAID" || i.invoice_no === data.purchase_invoice_no);
          
          const list = [
            { value: "ALL", label: "ALL Invoices" },
            ...pending.map((i) => ({
              value: i.invoice_no,
              label: `${i.invoice_no} (${i.type}) - TDS ₹${i.tds_amount || 0}`,
            })),
          ];
          setInvoiceList(list);
        }
      } catch (err) {
        showError("Failed to load TDS data");
      }
    };

    load();
  }, [id_param, isEdit]);

  useEffect(() => {
    getBanks(companyId).then((res) => {
      setBankList(res.data || []);
    });
  }, []);

  /* PARTY SEARCH */

  useEffect(() => {
    if (!partySearch) return;

    searchParty({
      q: partySearch,
      company_id: companyId,
    }).then((res) => setPartyList(res.data));
  }, [partySearch]);

  /* SELECT PARTY */

  const selectParty = (p) => {
    setSelectedPartyId(p.id);

    // setPartySearch(p.company_name);
    setPartySearch(`${p.company_name} [${p.ledger_number}]`);

    setPartyGst(p.gst_number || "");

    setPartyAddress(p.address || "");

    setPartyCity(p.city || "");

    setPartyState(p.state || "");

    setPartyPincode(p.pincode || "");

    setPartyPhone(p.mobile_number || "");

    setShowPartyDropdown(false);

    getTdsInvoicesByParty(companyId, p.id).then((res) => {
      console.log("INVOICE API RESPONSE", res.data);

      const invoices = res?.data?.data || res?.data || [];

      const pending = invoices.filter((i) => i.paid_status !== "PAID");

      const list = [
        { value: "ALL", label: "ALL Invoices" },

        ...pending.map((i) => ({
          value: i.invoice_no,
          label: `${i.invoice_no} (${i.type}) - TDS ₹${i.tds_amount || 0}`,
        })),
      ];

      setInvoiceList(list);
    });
  };

  const handleInvoiceSelect = async (invoiceNo) => {
    setSelectedInvoice(invoiceNo);

    const res = await getTdsInvoicesByParty(companyId, selectedPartyId);

    const invoices = res.data.data || [];

    if (invoiceNo === "ALL") {
      const pendingInvoices = invoices.filter(
        (inv) => inv.paid_status !== "PAID",
      );

      const totalTds = pendingInvoices.reduce(
        (sum, inv) => sum + Number(inv.tds_amount || 0),
        0,
      );

      setTdsAmount(totalTds);
      setSelectedInvoices(pendingInvoices.map((i) => i.invoice_no));
      setSelectedInvoiceIds(pendingInvoices.map((i) => i.id));
    } else {
      const invoice = invoices.find((i) => i.invoice_no === invoiceNo);
      if (!invoice) return;

      /* 🔴 CHECK TDS PAID */
      if (invoice.paid_status === "PAID") {
        showError("TDS already deposited for this invoice");
        setSelectedInvoice("");
        setTdsAmount(0);
        return;
      }

      setTdsAmount(Number(invoice.tds_amount || 0));
      setSelectedInvoices([invoiceNo]);
      setSelectedInvoiceIds([invoice.id]);
    }
  };

  /* ROW UPDATE */
  const updateRow = (i, key, value) => {
    setRows((prev) => {
      const copy = [...prev];

      const row = { ...copy[i] };

      row[key] = value;

      if (key === "taxType") {
        const tax = taxList.find((tx) => String(tx.id) === String(value));

        row.taxPercent = tax ? Number(tax.tax_percent) : 0;
      }

      const base = Number(row.rate || 0);

      const taxAmount = (base * Number(row.taxPercent || 0)) / 100;

      row.taxAmount = taxAmount;

      row.amount = base + taxAmount;

      copy[i] = row;

      return copy;
    });
  };

  const addRow = () =>
    setRows([
      ...rows,
      {
        item: "",
        hsn: "",
        rate: 0,
        taxType: "",
        taxPercent: 0,
        taxAmount: 0,
        amount: 0,
      },
    ]);

  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  /* TOTAL */

  const totalAmount = useMemo(
    () => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
    [rows],
  );

  const handleSubmit = async (type) => {
    if (!selectedPartyId) return showError("Select Party");
    if (!selectedInvoice) return showError("Select Invoice");
    if (!selectedGroup) return showError("Select Group");

    const group = groupList.find((g) => g.value === selectedGroup);

    const payload = {
      company_id: companyId,
      party_id: selectedPartyId,
      party_name: partySearch,
      group_id: selectedGroup,
      group_name: group?.label,
      purchase_invoice_no: selectedInvoice === "ALL" ? null : selectedInvoice,
      invoices: selectedInvoices,
      invoice_ids: selectedInvoiceIds,
      tds: tdsAmount,
      payment_type: paymentType,
      bank_name: bankName,
      payment_mode: paymentMode,
      cheque_number: chequeNumber,
      cheque_date: chequeDate,
      transaction_date: voucherDate,
      narration,
    };

    if (isEdit) {
      await updateTaxDuty(id_param, payload);
      showSuccess("TDS Updated Successfully");
    } else {
      await createTaxDuty(payload);
      showSuccess("TDS Paid Successfully");
    }

    if (type === "exit") {
      navigate("/TdsList");
    }

    if (type === "continue") {
      // form reset
      setSelectedInvoice("");
      setSelectedInvoices([]);
      setTdsAmount(0);
      setNarration("");
    }
  };

  /* UI SAME AS CREDIT NOTE */

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* HEADER */}

      <div className="bg-white border rounded-xl shadow-sm px-6 py-5 flex items-center justify-between overflow-visible">
        {/* LEFT */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border bg-gray-50 hover:bg-gray-100"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h2 className="text-lg font-semibold text-gray-800">TDS Payment</h2>

            <p className="text-xs text-gray-500">
              Record TDS payment against purchase invoices
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3 pt-3">
          <div className="w-[170px]">
            <FloatingDatePicker
              value={voucherDate}
              label="Date"
              onChange={setVoucherDate}
            />
          </div>
        </div>
      </div>

      {/* PARTY SECTION */}
      <div className="bg-white border rounded-xl shadow-sm">
        <div className="px-6 py-3 border-b bg-gray-50 rounded-t-xl">
          <h3 className="text-sm font-semibold text-gray-800 tracking-wide">
            Party Information
          </h3>
        </div>
        <div className="grid grid-cols-12 gap-6 p-6">
          <div className="col-span-4 relative">
            <FloatingInput
              label="Party Name"
              required
              value={partySearch}
              onChange={(e) => {
                setPartySearch(e.target.value);
                setShowPartyDropdown(true);
              }}
            />

            {showPartyDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-52 overflow-auto">
                {partyList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      selectParty(p);
                      setShowPartyDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="font-semibold text-sm">
                      {p.company_name}
                      <span className="text-xs text-gray-500"> [{p.ledger_number}]</span>
                    </div>

                    <div className="text-xs text-gray-500">
                      📞 {p.mobile_number || "-"} | {p.state || "-"} |{" "}
                      {p.city || "-"} | {p.pincode || "-"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-2">
            <FloatingInput label="GST Number" value={partyGst} readOnly />
          </div>

          <div className="col-span-4">
            <FloatingInput label="Address" value={partyAddress} readOnly />
          </div>

          <div className="col-span-2">
            <FloatingInput label="Pin Code" value={partyPincode} readOnly />
          </div>

          <div className="col-span-2">
            <FloatingInput label="City" value={partyCity} readOnly />
          </div>

          <div className="col-span-2">
            <FloatingInput label="State" value={partyState} readOnly />
          </div>

          <div className="col-span-2">
            <FloatingInput label="Contact No" value={partyPhone} readOnly />
          </div>

          <div className="col-span-12 border-t pt-4 mt-2">
            <h3 className="text-sm font-semibold text-gray-800 tracking-wide mb-3">
              TDS Details
            </h3>
          </div>

          {/* Invoice */}
          <div className="col-span-3">
            <FloatingSelect
              label="Against Invoice"
              placeholder="Select Invoice"
              required
              value={selectedInvoice}
              onChange={(e) => handleInvoiceSelect(e.target.value)}
              options={invoiceList}
            />
          </div>

          {/* TDS Amount */}
          <div className="col-span-3">
            <FloatingInput
              label="TDS Amount"
              type="number"
              value={tdsAmount}
              onChange={(e) => setTdsAmount(e.target.value)}
            />
          </div>

          <div className="col-span-3">
            <FloatingSelect
              label="Group"
              placeholder="Select Group"
              required
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              options={groupList}
            />
          </div>

          {/* Payment Type */}
          <div className="col-span-3">
            <FloatingSelect
              label="Payment Type"
              placeholder="Select Payment Type"
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
              options={[
                { value: "CASH", label: "Cash" },
                { value: "BANK", label: "Bank" },
              ]}
            />
          </div>

          {/* Bank Name */}
          {paymentType === "BANK" && (
            <div className="col-span-3">
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

          {/* Payment Mode */}
          {paymentType === "BANK" && (
            <div className="col-span-3">
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

          {/* Cheque Number */}
          {paymentType === "BANK" && paymentMode === "CHEQUE" && (
            <div className="col-span-3">
              <FloatingInput
                label="Cheque Number"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
              />
            </div>
          )}

          {/* Cheque Date */}
          {paymentType === "BANK" && paymentMode === "CHEQUE" && (
            <div className="col-span-3">
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
      <div className="bg-white border rounded-xl mt-4 p-4 shadow-sm">
        <FloatingInput
          label="Narration"
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
        />
      </div>

      {/* SUBMIT BUTTON */}
      <div className="flex justify-between mt-4">
        {/* CANCEL */}
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
        >
          Cancel
        </button>

        <div className="flex gap-3">
          {/* SAVE & CONTINUE */}
          <button
            onClick={() => handleSubmit("continue")}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow font-medium"
          >
            Save & Continue
          </button>

          {/* SAVE & EXIT */}
          <button
            onClick={() => handleSubmit("exit")}
            className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow font-medium"
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
}
