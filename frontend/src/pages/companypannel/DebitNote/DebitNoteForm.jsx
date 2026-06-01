import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  searchParty,
  getNextDebitNoteNo,
  createDebitNote,
  updateDebitNote,
  getDebitNoteById,
  getPurchaseById,
  getPurchaseInvoicesByParty,
  getAllTax,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";

/* FLOATING COMPONENTS (UNCHANGED) */

const FloatingDatePicker = ({ label, required, value, onChange }) => (
  <div className="relative w-full">
    <label className="absolute -top-2 left-3 bg-white px-1 text-xs">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <DatePicker
      selected={value ? new Date(value) : null}
      onChange={(date) => onChange(date.toISOString().slice(0, 10))}
      dateFormat="dd/MM/yyyy"
      className="w-full h-[44px] border rounded px-3"
    />
  </div>
);

const FloatingInput = ({ label, required, value, onChange, readOnly }) => (
  <div className="relative w-full">
    <input
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder=" "
      className="peer w-full h-[44px] border rounded px-3"
    />

    <label className="absolute left-3 -top-2 bg-white px-1 text-xs">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

const FloatingSelect = ({ label, required, value, onChange, options }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={onChange}
      className="w-full h-[44px] border rounded px-3"
    >
      <option value=""></option>

      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>

    <label className="absolute left-3 -top-2 bg-white px-1 text-xs">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

/* MAIN */

export default function DebitNoteForm() {
  const navigate = useNavigate();

  const [params] = useSearchParams();

  const debit_note_no_param = params.get("debit_note_no");

  const isEdit = !!debit_note_no_param;

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");

  const companyId = companyData.id;

  /* STATES */

  const [debitNoteNo, setDebitNoteNo] = useState("");
  const [debitNotePrefix, setDebitNotePrefix] = useState("");
  const [debitNoteSuffix, setDebitNoteSuffix] = useState("");

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
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");

  const [narration, setNarration] = useState("");

  const [taxList, setTaxList] = useState([]);

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

  /* GET NEXT NUMBER */

  useEffect(() => {
    if (isEdit) return;

    getNextDebitNoteNo(companyId).then((res) => {
      const fullNo = res.data.debit_note_no;
      const match = fullNo.match(/^(.*?)(\d+)$/);
      if (match) {
        setDebitNotePrefix(match[1]);
        setDebitNoteSuffix(match[2]);
      } else {
        setDebitNotePrefix(fullNo);
        setDebitNoteSuffix("");
      }
      setDebitNoteNo(fullNo);
    });
  }, []);

  /* LOAD TAX */

  useEffect(() => {
    getAllTax().then((res) => setTaxList(res.data?.data || []));
  }, []);

  /* LOAD EDIT */

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      const res = await getDebitNoteById(debit_note_no_param, companyId);

      const h = res.data.header;

      setDebitNoteNo(h.debit_note_no);
      const match = h.debit_note_no.match(/^(.*?)(\d+)$/);
      if (match) {
        setDebitNotePrefix(match[1]);
        setDebitNoteSuffix(match[2]);
      } else {
        setDebitNotePrefix(h.debit_note_no);
        setDebitNoteSuffix("");
      }

      setVoucherDate(h.voucher_date);

      setPartySearch(h.party_name);

      setSelectedPartyId(h.party_id);

      setPartyGst(h.gst_number || "");

      setPartyAddress(h.address || "");

      setPartyCity(h.city || "");

      setPartyState(h.state || "");

      setPartyPincode(h.pincode || "");

      setPartyPhone(h.mobile_number || "");

      setSelectedInvoice(h.purchase_invoice_no || "");

      setNarration(h.narration || "");

      const formatted = (res.data.items || []).map((i) => {
        const rate = Number(i.price_per_unit || 0);

        const taxPercent = Number(i.tax_percent || 0);

        const taxAmount = (rate * taxPercent) / 100;

        return {
          item: i.item_name || "",

          hsn: i.hsn || "",

          rate,

          taxType: String(i.tax_id || ""),

          taxPercent,

          taxAmount,

          amount: rate + taxAmount,
        };
      });

      setRows(formatted);

      const invoiceRes = await getPurchaseInvoicesByParty(h.party_id);
      const list = (invoiceRes.data.data || []).map((i) => ({
        value: String(i.id),
        label: `${i.invoice_no} (Due: ₹${i.due_amount})`,
        invoice_no: i.invoice_no,
      }));

      setInvoiceList(list);

      const currentInvoice = list.find((i) => i.invoice_no === h.purchase_invoice_no);
      if (currentInvoice) {
        setSelectedInvoiceId(currentInvoice.value);
        setSelectedInvoice(currentInvoice.invoice_no);
      } else {
        setSelectedInvoiceId("");
        setSelectedInvoice(h.purchase_invoice_no || "");
      }
    };

    load();
  }, [debit_note_no_param]);

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
    const display = `${p.company_name} [${p.ledger_number}]`;

    setSelectedPartyId(p.id);

    setPartySearch(display);

    setPartyGst(p.gst_number || "");

    setPartyAddress(p.address || "");

    setPartyCity(p.city || "");

    setPartyState(p.state || "");

    setPartyPincode(p.pincode || "");

    setPartyPhone(p.mobile_number || "");

    setShowPartyDropdown(false);

    getPurchaseInvoicesByParty(p.id).then((res) => {
      const list = (res.data.data || []).map((i) => ({
        value: String(i.id),
        label: `${i.invoice_no} (Due: ₹${i.due_amount})`,
        invoice_no: i.invoice_no,
      }));

      setInvoiceList(list);
    });
  };

  const handleInvoiceSelect = async (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    const selected = invoiceList.find((i) => String(i.value) === String(invoiceId));
    if (!selected) return;

    setSelectedInvoice(selected.invoice_no);

    try {
      const res = await getPurchaseById(invoiceId);
      const invoiceData = res.data?.data || res.data;
      const items = invoiceData.items || [];

      const newRows = items.map((item) => {
        const base = Number(item.price_per_unit || 0);
        const taxPercent = Number(item.tax_percent || 0);
        const taxAmount = Number(item.tax_amount || 0);

        return {
          item: item.item_name || "",
          hsn: item.hsn || "",
          rate: base,
          taxType: item.tax_id ? String(item.tax_id) : "",
          taxPercent: taxPercent,
          taxAmount: taxAmount,
          amount: base + taxAmount,
        };
      });

      setRows(newRows);
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      showError("Failed to load invoice items");
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

  const resetForm = async () => {
    setPartySearch("");
    setSelectedPartyId(null);
    setPartyGst("");
    setPartyAddress("");
    setPartyCity("");
    setPartyState("");
    setPartyPincode("");
    setPartyPhone("");

    setSelectedInvoiceId("");
    setSelectedInvoice("");
    setNarration("");

    setRows([
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

    // 🔥 New Debit Note Number
    const res = await getNextDebitNoteNo(companyId);
    const fullNo = res.data.debit_note_no;
    
    const match = fullNo.match(/^(.*?)(\d+)$/);
    if (match) {
      setDebitNotePrefix(match[1]);
      setDebitNoteSuffix(match[2]);
    } else {
      setDebitNotePrefix(fullNo);
      setDebitNoteSuffix("");
    }
    setDebitNoteNo(fullNo);
  };


  const save = async (type) => {
    if (!selectedPartyId) return showError("Select party");
    if (!selectedInvoice) return showError("Select invoice");

    const paddedSuffix = String(debitNoteSuffix).padStart(4, '0');
    const fullDebitNoteNo = debitNotePrefix + paddedSuffix;

    const payload = {
      company_id: companyId,
      debit_note_no: fullDebitNoteNo,
      purchase_invoice_no: selectedInvoice,
      voucher_date: voucherDate,
      party_id: selectedPartyId,
      narration,
      total_amount: totalAmount,

      rows: rows.map((r) => ({
        item_name: r.item,
        hsn: r.hsn || null,
        qty: 1,
        price_per_unit: Number(r.rate),
        tax_id: r.taxType ? Number(r.taxType) : null,
        tax_percent: Number(r.taxPercent),
        tax_amount: Number(r.taxAmount),
        amount: Number(r.amount),
      })),
    };

    try {
      if (isEdit) {
        await updateDebitNote(debitNoteNo, payload);
        showSuccess("Debit Note updated successfully");
      } else {
        await createDebitNote(payload);
        showSuccess("Debit Note created successfully");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save debit note");
      return;
    }

    if (type === "exit") {
      navigate("/voucher/DNNoteList");
    } else {
      // ✅ SAVE & CONTINUE FIX
      await resetForm();
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  /* UI SAME AS CREDIT NOTE */

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* HEADER */}

      <div className="bg-gray-50 border rounded-xl px-4 py-3 flex justify-between">
        <div className="flex gap-3 items-center">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>

          <h1 className="font-semibold">Debit Note</h1>
        </div>

        <div className="flex gap-4 items-center">
          <FloatingDatePicker
            label="Date"
            value={voucherDate}
            onChange={setVoucherDate}
          />

          <div className="relative w-[220px]">
            <label className="absolute left-3 -top-2 bg-white px-1 text-xs z-20">
              Debit Note No
            </label>

            <div className="flex">
              <input
                value={debitNotePrefix}
                readOnly
                className="w-[150px] h-[44px] border rounded-l px-3 bg-gray-100"
              />

              <input
                value={debitNoteSuffix}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setDebitNoteSuffix(value);
                }}
                maxLength={4}
                className="w-[70px] h-[44px] border-t border-r border-b rounded-r px-3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PARTY SECTION */}
      <div className="bg-white border rounded-xl mt-4 shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-4">
          {/* Party Name */}
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
                      <span className="text-xs text-gray-500">
                        {" "}
                        [{p.ledger_number}]
                      </span>
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

          <div className="col-span-3">
            <FloatingInput label="GST Number" value={partyGst} readOnly />
          </div>

          <div className="col-span-3">
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

          {/* Against Invoice */}
          <div className="col-span-3">
            <div className="relative w-full">
              <input
                list="invoice_list"
                className="peer w-full h-[44px] rounded-[10px] px-[14px] text-sm bg-white outline-none border border-gray-800 focus:border-[#FF4200]"
                placeholder=" "
                value={selectedInvoice}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedInvoice(val);
                  const found = invoiceList.find(i => i.invoice_no === val || i.label === val);
                  if (found) {
                    handleInvoiceSelect(found.value);
                  } else {
                    setSelectedInvoiceId("");
                  }
                }}
              />
              <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2">
                Against Invoice <span className="text-red-500">*</span>
              </label>
              <datalist id="invoice_list">
                {invoiceList.map((i, idx) => (
                  <option key={idx} value={i.invoice_no}>{i.label}</option>
                ))}
              </datalist>
            </div>
          </div>
        </div>
      </div>

      {/* ITEM TABLE */}
      <div className="bg-white border rounded-xl mt-4 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 text-sm">
            <tr className="text-left">
              <th className="p-3 border">SR</th>
              <th className="p-3 border">Item/Service</th>
              <th className="p-3 border">HSN</th>
              <th className="p-3 border">Amount</th>
              <th className="p-3 border text-center">Tax</th>
              <th className="p-3 border text-right">Total Amount</th>

              <th className="p-3 border text-center">DEL</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="text-sm">
                <td className="border p-2 text-center">{i + 1}</td>

                <td className="border p-2">
                  <input
                    value={r.item}
                    onChange={(e) => updateRow(i, "item", e.target.value)}
                    className="w-full h-9 border rounded px-2"
                  />
                </td>

                <td className="border p-2">
                  <input
                    value={r.hsn || ""}
                    onChange={(e) => updateRow(i, "hsn", e.target.value)}
                    className="w-full h-9 border rounded px-2"
                  />
                </td>

                <td className="border p-2">
                  <input
                    type="number"
                    value={r.rate}
                    onChange={(e) => updateRow(i, "rate", e.target.value)}
                    className="w-full h-9 border rounded px-2"
                  />
                </td>
                <td className="border p-2">
                  <div className="flex gap-2">
                    <select
                      value={String(r.taxType || "")}
                      onChange={(e) => updateRow(i, "taxType", e.target.value)}
                    >
                      <option value="">None</option>

                      {taxList.map((tax) => (
                        <option key={tax.id} value={String(tax.id)}>
                          {tax.tax_name}
                        </option>
                      ))}
                    </select>

                    <input
                      value={Number(r.taxAmount || 0).toFixed(2)}
                      readOnly
                      className="h-9 w-[100px] border rounded px-2 bg-gray-50"
                    />
                  </div>
                </td>

                <td className="border p-2 text-right font-medium">
                  ₹ {Number(r.amount || 0).toFixed(2)}
                </td>

                <td className="border p-2 text-center">
                  <button
                    onClick={() => removeRow(i)}
                    className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1 rounded"
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-3">
          <button
            onClick={addRow}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            + ADD ROW
          </button>
        </div>

        {/* TOTAL */}
        <div className="flex justify-end border-t bg-gray-50 p-4">
          <div className="text-lg font-semibold">
            Total : ₹ {totalAmount.toFixed(2)}
          </div>
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

      {/* SAVE BUTTONS */}
      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => save("continue")}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow"
        >
          Save & Continue
        </button>

        <button
          onClick={() => save("exit")}
          className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow"
        >
          Save & Exit
        </button>

        <button
          onClick={handleCancel}
          className="px-6 py-2 rounded-lg bg-gray-400 text-white hover:bg-gray-500 shadow"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
