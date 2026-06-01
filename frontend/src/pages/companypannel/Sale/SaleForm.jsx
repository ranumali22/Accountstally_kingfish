import React, { useMemo, useState, useEffect, useRef } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  searchParty,
  createParty,
  createSale,
  updateSale,
  getAllTax,
  getAllUnits,
  fetchPincodeDetails,
  getNextSaleInvoice,
  fetchItems,
  createItem,
  getSaleById,
  getBanks,
  getGstList,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";
import { toYYYYMMDD } from "../../../utils/dateUtils";

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
        onChange={(date) => onChange(toYYYYMMDD(date))}
        dateFormat="dd/MM/yyyy"
        placeholderText="dd/mm/yyyy"
        showPopperArrow={false}
        className="w-full h-[44px] rounded-[12px] px-3 text-sm outline-none border 
                   border-gray-300 bg-white focus:border-[#FF4200]"
      />
    </div>
  );
};

const FloatingInput = ({
  label,
  required = false,
  value,
  onChange,
  type = "text",
  error = false,
  readOnly = false,
}) => (
  <div className="relative w-full">
    <input
      type={type}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder=" "
      className="peer w-full h-[44px] rounded-[10px] px-[14px] text-sm bg-white outline-none border border-gray-800 focus:border-[#FF4200]"
    />
    <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2 peer-focus:text-[#FF4200]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {error && <p className="mt-1 text-xs text-red-500">Invalid</p>}
  </div>
);

const FloatingSelect = ({
  label,
  required = false,
  value,
  onChange,
  options = [],
  disabled = false,
}) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="peer h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition border-gray-800 focus:border-[#FF4200]"
    >
      <option value="">
        Select {label} {/* ✅ FIXED */}
      </option>

      {options.map((op) => (
        <option key={op.value} value={op.value}>
          {op.label}
        </option>
      ))}
    </select>

    <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2 peer-focus:text-[#FF4200]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

const FloatingTextarea = ({ label, value, onChange, rows = 3 }) => (
  <div className="relative w-full">
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder=" "
      className="peer w-full rounded-xl px-4 py-2 text-sm bg-white outline-none border border-gray-800 resize-none focus:border-[#FF4200]"
    />
    <label className="absolute left-4 bg-white px-1 text-gray-700 text-sm -top-2 peer-focus:text-[#FF4200]">
      {label}
    </label>
  </div>
);

export default function SaleForm() {
  const navigate = useNavigate();

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;
  const companyState = companyData.state || "";
  const urlMode = new URLSearchParams(window.location.search).get("mode");
  const isEdit = urlMode === "edit";
  const [editBill, setEditBill] = useState(null);
  const [itemList, setItemList] = useState([]);

  const [mode, setMode] = useState("SERVICE");
  const [showModePopup, setShowModePopup] = useState(false);
  const [bankList, setBankList] = useState([]);
  const [date, setDate] = useState(new Date());
  const [billDate, setBillDate] = useState(toYYYYMMDD(new Date()));
  const [gstMasterList, setGstMasterList] = useState([]);
  const [paymentMode, setPaymentMode] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [narration, setNarration] = useState("");
  const [editLoaded, setEditLoaded] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partyPhone, setPartyPhone] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyGst, setPartyGst] = useState("");
  const [partyState, setPartyState] = useState("");
  const [partyCity, setPartyCity] = useState("");
  const [partyPincode, setPartyPincode] = useState("");
  const [partyList, setPartyList] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [partyDisplayName, setPartyDisplayName] = useState("");
  const [unitList, setUnitList] = useState([]);
  const [taxList, setTaxList] = useState([]);
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentType, setPaymentType] = useState("NONE");
  const [saving, setSaving] = useState(false);
  const [savingType, setSavingType] = useState("");
  const lastPartyState = useRef("");
  // "" | "continue" | "exit"
  useEffect(() => {
    const fetchMasters = async () => {
      const [unitRes, taxRes, itemRes, gstRes] = await Promise.all([
        getAllUnits(),
        getAllTax(),
        fetchItems(),
        getGstList(),
      ]);

      setUnitList(unitRes.data?.data || []);
      setTaxList(taxRes.data?.data || []);
      setItemList(itemRes.data?.data || []);
      setGstMasterList(gstRes.data?.data || []);
    };

    fetchMasters();
  }, []);

  useEffect(() => {
    const paid = Number(paidAmount || 0);

    if (paid === 0) {
      setPaymentType("");
      setBankName("");
      setPaymentMode("");
      setChequeNumber("");
      setChequeDate("");
    }
  }, [paidAmount]);

  useEffect(() => {
    console.log("TAX LIST =", taxList);
  }, [taxList]);

  const [rows, setRows] = useState([
    {
      item: "",
      hsn: "",
      qty: 1,
      unit: "",
      showItemDropdown: false,
      priceType: "WITHOUT_TAX",
      pricePerUnit: 0,
      taxType: "",
      taxPercent: 18,
      taxAmount: 0,
      amount: 0,
    },
  ]);

  const money = (v) => Number(v || 0);

  useEffect(() => {
    if (!partySearch.trim() || !companyId) {
      setPartyList([]);
      return;
    }

    searchParty({ q: partySearch, company_id: companyId })
      .then((res) => setPartyList(res.data || []))
      .catch(console.error);
  }, [partySearch, companyId]);

  const selectParty = (p) => {
    const display = `${p.company_name} [${p.ledger_number}]`;
    setSelectedPartyId(p.id);
    setPartyDisplayName(display);
    setPartySearch(display); // 👈 input me ye dikhega
    setPartyName(p.company_name); // 👈 backend ke liye clean name
    setPartyPhone(p.mobile_number || "");
    setPartyGst(p.gst_number || "");
    setPartyAddress(p.address || "");
    setPartyState(p.state || "");
    setPartyCity(p.city || "");
    setPartyPincode(p.pincode || "");

    setShowPartyDropdown(false);
  };

  const getStateCodeFromGST = (gst) => {
    if (!gst || gst.length < 2) return null;
    return gst.substring(0, 2);
  };

  const normalize = (s) => (s || "").toString().toLowerCase().trim();

  const getGstMode = () => {
    const pState = normalize(partyState);
    const pCode = (selectedPartyId ? partyList.find(p => p.id === selectedPartyId)?.state_code : "") || "";
    const pGst = (partyGst || "").trim();
    const pPrefix = pGst.substring(0, 2);

    const cState = normalize(companyState);
    const cGstCode = (companyData.gst_state_code || "").toString().trim();
    const cGst = (companyData.gst_number || "").trim();
    const cPrefix = cGst.substring(0, 2);

    const companyStates = new Set();
    const companyCodes = new Set();

    if (cState) companyStates.add(cState);
    if (cGstCode) companyCodes.add(cGstCode);
    if (cPrefix && /^\d{2}$/.test(cPrefix)) companyCodes.add(cPrefix);

    gstMasterList.filter(g => g.delete_status === "show").forEach(g => {
      if (g.state) companyStates.add(normalize(g.state));
      const prefix = (g.gst_number || "").substring(0, 2);
      if (prefix && /^\d{2}$/.test(prefix)) companyCodes.add(prefix);
    });

    if (pState && companyStates.has(pState)) return "INTRA";
    if (pCode && companyCodes.has(pCode.toString())) return "INTRA";
    if (pPrefix && companyCodes.has(pPrefix)) return "INTRA";

    return "INTER";
  };

  useEffect(() => {
    // 🚫 Absolute protection: Never reset during initial edit load
    if (isEdit && !editLoaded) {
      if (partyState) lastPartyState.current = partyState;
      return;
    }

    if (!partyState) return;

    // In edit mode, we only want to reset if the party actually changed AFTER the initial load
    if (isEdit && editLoaded) {
      if (lastPartyState.current && lastPartyState.current !== partyState) {
        console.log("DEBUG: PARTY STATE CHANGED IN EDIT MODE - RESETTING TAXES");
      } else {
        lastPartyState.current = partyState;
        return;
      }
    }

    if (lastPartyState.current === partyState) return;
    lastPartyState.current = partyState;

    console.log("DEBUG: RESETTING ROWS NOW!");
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        taxType: "",
        taxPercent: 0,
        taxAmount: 0,
        amount: 0,
      })),
    );
  }, [partyState, isEdit, editLoaded]);

  const recalcRow = (row) => {
    const qty = mode === "ITEM" ? money(row.qty) : 1;
    const price = money(row.pricePerUnit);
    const base = qty * price;
    const taxPercent = money(row.taxPercent);

    let taxAmount = 0;
    let amount = 0;

    if (row.priceType === "WITH_TAX") {
      const baseWithoutTax = base / (1 + taxPercent / 100);
      taxAmount = base - baseWithoutTax;
      amount = base;
    } else {
      taxAmount = (base * taxPercent) / 100;
      amount = base + taxAmount;
    }

    const res = {
      ...row,
      taxAmount: Number(taxAmount.toFixed(2)),
      amount: Number(amount.toFixed(2)),
    };
    console.log("DEBUG: recalcRow ->", { mode, qty, price, base, taxPercent, taxAmount, amount, result: res });
    return res;
  };

  const updateRow = (index, key, value) => {
    setRows((prev) => {
      const newRows = [...prev];

      const r = { ...newRows[index], [key]: value };

      // ⭐ WITH TAX SELECT → GST 0%
      if (key === "priceType" && value === "WITH_TAX") {
        r.taxType = "";
        r.taxPercent = 0;
        r.taxAmount = 0;
      }

      // TAX SELECT
      if (key === "taxType" && r.priceType !== "WITH_TAX") {
        const taxObj = taxList.find((t) => String(t.id) === String(value));

        if (taxObj) {
          const gstMode = getGstMode();

          if (gstMode === "INTRA") {
            r.taxPercent =
              Number(taxObj.cgst_percent || 0) +
              Number(taxObj.sgst_percent || 0);
          } else if (gstMode === "INTER") {
            r.taxPercent = Number(taxObj.igst_percent || 0);
          } else {
            r.taxPercent = 0;
          }
        } else {
          r.taxPercent = 0;
        }
      }

      newRows[index] = recalcRow(r);

      return newRows;
    });
  };

  const addRow = () => {
    const gstMode = getGstMode();

    const validTaxes = taxList.filter((t) => {
      if (!gstMode) return false;

      if (gstMode === "INTRA") {
        return Number(t.cgst_percent) > 0 && Number(t.sgst_percent) > 0;
      }

      if (gstMode === "INTER") {
        return Number(t.igst_percent) > 0;
      }

      return false;
    });

    const defaultTax =
      validTaxes.find((t) => Number(t.tax_percent) === 18) ||
      (validTaxes.length ? validTaxes[0] : null);

    // 🔥 FIX
    let taxPercent = 18;

    if (defaultTax) {
      if (gstMode === "INTRA") {
        taxPercent =
          Number(defaultTax.cgst_percent || 0) +
          Number(defaultTax.sgst_percent || 0);
      } else {
        taxPercent = Number(defaultTax.igst_percent || 0);
      }
    }

    setRows((prev) => [
      ...prev,
      {
        item: "",
        hsn: "",
        qty: 1,
        unit: "",
        showItemDropdown: false,
        priceType: "WITHOUT_TAX",
        pricePerUnit: 0,
        taxType: defaultTax?.id || "",
        taxPercent: taxPercent, // ✅ FIXED
        taxAmount: 0,
        amount: 0,
      },
    ]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = useMemo(
    () => rows.reduce((sum, r) => sum + money(r.amount), 0),
    [rows],
  );

  const dueAmount = useMemo(() => {
    const due = totalAmount - money(paidAmount);
    return due < 0 ? 0 : due;
  }, [totalAmount, paidAmount]);

  const resetForm = () => {
    setNarration("");
    setPaidAmount("");
    setPaymentType("");
    setBankName("");
    setPaymentMode("");
    setChequeNumber("");
    setChequeDate("");
    setPartyName("");
    setPartySearch("");
    setPartyPhone("");
    setPartyAddress("");
    setPartyGst("");
    setPartyState("");
    setPartyCity("");
    setPartyPincode("");
    setSelectedPartyId(null);

    setPartyList([]);

    setRows([
      {
        item: "",
        hsn: "",
        qty: 1,
        unit: "",
        priceType: "WITHOUT_TAX",
        pricePerUnit: 0,
        taxType: "",
        taxPercent: 0,
        taxAmount: 0,
        amount: 0,
      },
    ]);
  };

  useEffect(() => {
    if (!isEdit) return;

    const billId = new URLSearchParams(window.location.search).get("id");
    if (!billId) return;

    const fetchSale = async () => {
      try {
        const res = await getSaleById(billId);

        const header = res.data.data.header;
        const items = res.data.data.items;

        console.log("FULL SALE->>>:", res.data);

        setEditBill(header);

        // ================= HEADER =================
        setMode(header.mode || "SERVICE");

        if (header.voucher_date) {
          setBillDate(header.voucher_date);
          setDate(new Date(header.voucher_date));
        }

        setInvoiceNo(header.invoice_no || "");

        setSelectedPartyId(header.party_id || null);
        // ✅ PARTY FIX
        setPartyName(header.party_name || "");
        setPartySearch(header.party_name || "");

        // ✅ CORRECT FIELD MAPPING
        setPartyPhone(header.party_mobile || "");
        setPartyAddress(header.party_address || "");
        setPartyState(header.party_state || "");
        setPartyCity(header.party_city || "");
        setPartyPincode(header.party_pincode || "");

        setPartyGst(header.party_gstin || "");
        setPaymentType((header.payment_type || "").toUpperCase());
        // setBankName(header.bank_name || "");
        setBankName(header.bank_id || "");
        setPaymentMode(header.payment_mode || "");
        setChequeNumber(header.cheque_number || "");
        setChequeDate(header.cheque_date || "");

        setPaidAmount(String(header.paid_amount || 0));
        setNarration(header.narration || "");

        // ================= ITEMS =================
        if (res.data.data.items) {
          console.log("DEBUG: Raw Items from API ->", res.data.data.items);
          const mappedRows = res.data.data.items.map((r) => {
            const qty = Number(r.qty || 1);
            const taxAmount = Number(r.tax_amount || 0);
            const totalAmount = Number(r.amount || 0);

            // const baseAmount = totalAmount - taxAmount;
            // const pricePerUnit = qty > 0 ? baseAmount / qty : baseAmount;

            return {
              id: r.id,
              item_id: r.item_id,
              item: r.item_name,
              hsn: r.hsn || "",
              qty: qty,
              unit: r.unit_id || "",
              showItemDropdown: false,
              priceType: r.price_type || "WITHOUT_TAX",
              pricePerUnit: Number(r.price_per_unit || 0),
              taxType: String(r.tax_id || ""),
              taxPercent: Number(r.tax_percent) || 18,
              taxAmount: Number(r.tax_amount || 0),
              amount: Number(r.amount || 0),
            };
          });

          console.log("DEBUG: Final Mapped Rows ->", mappedRows);
          setRows(mappedRows);
        }

        setEditLoaded(true);
      } catch (err) {
        console.error("Edit fetch failed", err);
      }
    };

    fetchSale();
  }, [isEdit]);

  const saveSale = async (action) => {
    // 🚫 DOUBLE CLICK BLOCK
    if (savingType) return;

    setSavingType(action); // 🔥 track which button clicked

    try {
      // =========================
      // ⛔ EDIT SAFETY
      // =========================
      if (isEdit && (!editLoaded || !editBill?.id)) {
        showError("Please wait, loading bill...");
        setSavingType("");
        return;
      }

      // =========================
      // 📞 MOBILE VALIDATION
      // =========================
      if (partyPhone && !/^[6-9]\d{9}$/.test(partyPhone)) {
        showError("Invalid mobile number");
        setSavingType("");
        return;
      }

      // =========================
      // 🧾 BASIC VALIDATION
      // =========================
      if (!partyName.trim()) {
        showError("Party A/c name required");
        setSavingType("");
        return;
      }

      if (!narration.trim()) {
        showError("Narration is required");
        setSavingType("");
        return;
      }

      // =========================
      // 💰 AMOUNT VALIDATION
      // =========================
      if (Number(paidAmount) < 0) {
        showError("Paid amount cannot be negative");
        setSavingType("");
        return;
      }

      // =========================
      // 🏦 BANK VALIDATION
      // =========================
      if (paymentType === "BANK") {
        if (!bankName) {
          showError("Please select bank");
          setSavingType("");
          return;
        }

        if (!paymentMode) {
          showError("Please select payment mode");
          setSavingType("");
          return;
        }

        if (paymentMode === "CHEQUE") {
          if (!chequeNumber || !chequeDate) {
            showError("Cheque number & date required");
            setSavingType("");
            return;
          }
        }
      }

      // =========================
      // 📦 ROW VALIDATION
      // =========================
      if (!rows.length) {
        showError("Please add at least 1 row");
        setSavingType("");
        return;
      }

      for (const r of rows) {
        if (!r.item?.trim()) {
          showError("Item name required in all rows");
          setSavingType("");
          return;
        }

        if (Number(r.pricePerUnit) < 0) {
          showError("Price cannot be negative");
          setSavingType("");
          return;
        }
      }

      const validRows = rows.filter((r) => r.item.trim());

      // =========================
      // 👤 PARTY HANDLING (SEND DETAILS TO BACKEND)
      // =========================
      let partyDetails = null;

      if (!selectedPartyId) {
        partyDetails = {
          company_name: partyName,
          mobile_number: partyPhone,
          gst_number: partyGst,
          address: partyAddress,
          state: partyState,
          city: partyCity,
          pincode: partyPincode,
        };
      }

      // =========================
      // 📦 ITEM AUTO CREATE
      // =========================
      const updatedRows = [];

      const localItemMap = new Map(
        itemList.map((it) => [it.item_name.trim().toLowerCase(), it]),
      );

      for (const r of validRows) {
        const key = r.item.trim().toLowerCase();

        let itemMatch = localItemMap.get(key);

        if (!itemMatch) {
          const res = await createItem({
            item_name: r.item.trim(),
            hsn_code: r.hsn || null,
            unit_id: r.unit || null,
            display_index: 0,
          });

          const newItem = {
            id: res.data.id,
            item_name: r.item.trim(),
            hsn_code: r.hsn || null,
            unit_id: r.unit || null,
          };

          localItemMap.set(key, newItem);
          setItemList((prev) => [...prev, newItem]);

          itemMatch = newItem;
        }

        updatedRows.push({
          ...r,
          item_id: itemMatch.id,
        });
      }

      if (paymentType === "BANK" && !paymentMode) {
        showError("Select payment mode properly");
        return;
      }

      // =========================
      // 📤 FINAL PAYLOAD
      // =========================
      const payload = {
        id: isEdit ? editBill?.id : undefined,
        company_id: companyId,
        voucher_date: billDate,
        mode,
        party_id: selectedPartyId || null,
        party_details: partyDetails,
        narration,

        total_amount: Math.round(totalAmount * 100) / 100,
        payment_type: paymentType || "NONE",
        paid_amount: Math.round(money(paidAmount) * 100) / 100,
        due_amount: Math.round(dueAmount * 100) / 100,

        // payment_mode: paymentType === "BANK" ? paymentMode : null,
        // bank_id: paymentType === "BANK" ? Number(bankName) || null : null,

        payment_mode:
          paymentType === "BANK" && paymentMode ? paymentMode : null,

        bank_id: paymentType === "BANK" && bankName ? Number(bankName) : null,

        cheque_number:
          paymentType === "BANK" && paymentMode === "CHEQUE"
            ? chequeNumber
            : null,

        cheque_date:
          paymentType === "BANK" && paymentMode === "CHEQUE"
            ? chequeDate
            : null,

        rows: updatedRows.map((r) => ({
          id: r.id || null,
          row_type: mode,
          item_id: r.item_id || null,
          item_name: r.item,
          hsn: r.hsn || null,
          qty: mode === "ITEM" ? money(r.qty) : null,
          unit_id: mode === "ITEM" ? r.unit || null : null,
          price_type: r.priceType,
          tax_id: r.taxType ? Number(r.taxType) : null,
          price_per_unit: money(r.pricePerUnit),
          tax_percent: money(r.taxPercent),
          tax_amount: money(r.taxAmount),
          amount: money(r.amount),
        })),
      };

      // =========================
      // 💾 SAVE API
      // =========================
      const res2 = isEdit
        ? await updateSale(editBill.id, payload)
        : await createSale(payload);

      if (!res2.data || res2.status !== 200) {
        throw new Error("Save failed");
      }

      showSuccess(`Sale Saved ✅ Invoice: ${res2.data.invoice_no}`);

      if (action === "continue") {
        resetForm();
        const res = await fetchItems();
        setItemList(res.data.data || []);
      } else {
        navigate("/income/sales");
      }
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Something went wrong";

      showError(msg);
    } finally {
      setSavingType(""); // 🔓 unlock
    }
  };

  const totalCols = mode === "ITEM" ? 9 : 7;
  useEffect(() => {
    if (!companyId || isEdit) return;

    const fetchInvoice = async () => {
      try {
        const res = await getNextSaleInvoice();

        console.log("Invoice API:", res.data);

        if (res.data?.success) {
          setInvoiceNo(res.data.invoice_no);
        }
      } catch (err) {
        console.error("Invoice fetch failed", err);
      }
    };

    fetchInvoice();
  }, [companyId]);

  const selectItemForRow = (rowIndex, item) => {
    setRows((prev) => {
      const newRows = [...prev];

      newRows[rowIndex] = {
        ...newRows[rowIndex],
        item: item.item_name,
        hsn: item.hsn_code || "",
        unit: item.unit_id || "",
        showItemDropdown: false,
      };

      return newRows;
    });
  };

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

  useEffect(() => {
    const fetchGst = async () => {
      try {
        const res = await getGstList();
        setGstMasterList(res.data.data || []);
      } catch (err) {
        console.error("GST master fetch failed", err);
      }
    };

    fetchGst();
  }, [companyId]);

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* TOP BAR */}
      <div className="bg-[#FFFFFF] border border-darkborder rounded-xl shadow-sm px-4 py-3 flex items-center justify-between mb-4 ">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/income/sales")}
            className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="font-semibold text-gray-800">
            {isEdit ? "Edit Sale" : "Sale"}
          </div>
        </div>

        <button
          onClick={() => setShowModePopup(true)}
          className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Change Mode
        </button>
      </div>

      <div className="bg-white border rounded-md overflow-hidden">
        {/* HEADER */}
        <div className="px-4 py-3 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold">
              {isEdit ? "Edit Sale" : "Sale"}
            </span>

            <span className="text-sm text-gray-600">
              Mode:{" "}
              <b className="text-gray-900">
                {mode === "ITEM" ? "Item Invoice" : "Service Invoice"}
              </b>
            </span>
          </div>

          <div className="flex items-end gap-3 flex-nowrap">
            <FloatingDatePicker
              label="Date"
              required
              value={billDate}
              onChange={(val) => {
                setBillDate(val); // backend ke liye
                setDate(new Date(val)); // DatePicker ke liye
              }}
            />

            <div className="flex-1 min-w-[140px]">
              <FloatingInput label="Invoice No." value={invoiceNo} readOnly />
            </div>
          </div>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3">
            {/* Party Search */}
            <div className="lg:col-span-3 sm:col-span-1 relative">
              <FloatingInput
                label="Party Name"
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setPartyDisplayName(e.target.value);
                  setPartyName(e.target.value); // new party case
                  setShowPartyDropdown(true);
                }}
                required
              />

              {showPartyDropdown && partySearch && partyList.length > 0 && (
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
                        {p.company_name}{" "}
                        <span className="text-xs text-gray-500">
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

            {/* GST */}
            <div className="lg:col-span-3 sm:col-span-1">
              <FloatingInput
                label="GST Number"
                value={partyGst}
                onChange={(e) => setPartyGst(e.target.value.toUpperCase())}
              />
            </div>

            {/* Address */}
            <div className="lg:col-span-4 sm:col-span-1">
              <FloatingInput
                label="Address"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
              />
            </div>

            <div className="lg:col-span-2 sm:col-span-1">
              <FloatingInput
                label="Pin Code"
                value={partyPincode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (v.length > 6) return;

                  setPartyPincode(v);

                  if (v.length === 6) {
                    fetchPincodeDetails(v)
                      .then((res) => {
                        const d = res.data.data;

                        setPartyCity(d.city_name || "");
                        setPartyState(d.state_name || "");

                        if (d.address) {
                          setPartyAddress(d.address);
                        }
                      })
                      .catch((err) => {
                        console.error("Invalid pincode", err);

                        setPartyCity("");
                        setPartyState("");
                        setPartyAddress("");
                      });
                  }

                  if (v.length < 6) {
                    setPartyCity("");
                    setPartyState("");
                    setPartyAddress("");
                  }
                }}
                type="text"
                required
                error={partyPincode && partyPincode.length !== 6}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-3">
              <FloatingInput
                label="City"
                value={partyCity}
                onChange={(e) => setPartyCity(e.target.value)}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="State"
                value={partyState}
                onChange={(e) => setPartyState(e.target.value)}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="GST Mode"
                value={
                  getGstMode() === "INTRA"
                    ? "CGST + SGST"
                    : getGstMode() === "INTER"
                      ? "IGST"
                      : ""
                }
                readOnly
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Contact No."
                value={partyPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, ""); // only number

                  if (val.length <= 10) {
                    setPartyPhone(val);
                  }
                }}
                error={partyPhone && !/^[6-9]\d{9}$/.test(partyPhone)}
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="border-t">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="border p-2 w-12 text-center">SR</th>

                  <th className="border p-1 text-left min-w-[180px]">
                    {mode === "ITEM" ? "Item" : "Service"}
                  </th>

                  <th className="border p-2 text-center w-[110px]">HSN</th>

                  {mode === "ITEM" && (
                    <>
                      <th className="border p-2 text-center w-[90px]">QTY</th>
                      <th className="border p-2 text-center w-[110px]">UNIT</th>
                    </>
                  )}

                  <th className="border p-2 text-center w-[240px]">
                    {mode === "ITEM" ? "Price / Unit" : "Amount"}
                  </th>

                  <th className="border p-2 text-center w-[200px]">TAX</th>

                  <th className="border p-2 text-right w-[140px]">Total</th>

                  <th className="border p-2 text-center w-[70px]">DEL</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">{i + 1}</td>

                    {/* ITEM / SERVICE */}
                    <td className="border p-2">
                      <div className="relative">
                        <input
                          value={r.item}
                          onChange={(e) => {
                            updateRow(i, "item", e.target.value);
                            setRows((prev) => {
                              const copy = [...prev];
                              copy[i].showItemDropdown = true;
                              return copy;
                            });
                          }}
                          onFocus={() => {
                            setRows((prev) => {
                              const copy = [...prev];
                              copy[i].showItemDropdown = true;
                              return copy;
                            });
                          }}
                          className="h-9 w-full border rounded px-2"
                          placeholder="Search item..."
                        />

                        {mode === "ITEM" && r.showItemDropdown && (
                          <div className="absolute z-50 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                            {itemList
                              .filter((it) =>
                                it.item_name
                                  .toLowerCase()
                                  .includes(r.item.toLowerCase()),
                              )
                              .slice(0, 20)
                              .map((it) => (
                                <div
                                  key={it.id}
                                  onClick={() => selectItemForRow(i, it)}
                                  className="px-3 py-2 cursor-pointer hover:bg-blue-50"
                                >
                                  <div className="font-medium text-sm">
                                    {it.item_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    HSN: {it.hsn_code || "-"}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* HSN */}
                    <td className="border p-2 text-center w-[110px]">
                      <input
                        value={r.hsn}
                        onChange={(e) => updateRow(i, "hsn", e.target.value)}
                        className="h-9 w-[100px] text-center border rounded px-2"
                        placeholder="HSN"
                      />
                    </td>

                    {mode === "ITEM" && (
                      <>
                        {/* QTY */}
                        <td className="border p-2 text-center">
                          <input
                            type="number"
                            value={r.qty}
                            onChange={(e) =>
                              updateRow(i, "qty", e.target.value)
                            }
                            className="h-9 w-[70px] text-center border rounded px-2"
                          />
                        </td>

                        {/* UNIT */}
                        <td className="border p-2 text-center">
                          <select
                            value={r.unit}
                            onChange={(e) =>
                              updateRow(i, "unit", e.target.value)
                            }
                            className="h-9 w-[110px] border rounded px-2 bg-white"
                          >
                            {unitList.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.unit_name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </>
                    )}

                    {/* PRICE */}
                    <td className="border p-2 text-center">
                      <div className="flex items-center gap-3 justify-center">
                        <select
                          className="h-9 border rounded px-2 bg-white text-xs"
                          value={r.priceType}
                          onChange={(e) =>
                            updateRow(i, "priceType", e.target.value)
                          }
                        >
                          <option value="WITHOUT_TAX">Without Tax</option>
                          <option value="WITH_TAX">With Tax</option>
                        </select>

                        <input
                          type="number"
                          min="0"
                          value={r.pricePerUnit === 0 ? "" : r.pricePerUnit}
                          onChange={(e) => {
                            let val = e.target.value;

                            // ❌ negative block
                            if (Number(val) < 0) return;

                            updateRow(
                              i,
                              "pricePerUnit",
                              val === "" ? 0 : Number(val),
                            );
                          }}
                          className="h-9 w-[90px] text-center border rounded px-2"
                          placeholder="Price"
                        />
                      </div>
                    </td>

                    {/* TAX */}
                    <td className="border p-1">
                      <div className="flex items-center gap-3 justify-center">
                        <select
                          value={r.taxType || ""}
                          disabled={r.priceType === "WITH_TAX"}
                          onChange={(e) =>
                            updateRow(i, "taxType", e.target.value)
                          }
                        >
                          <option value="">NONE</option>

                          {taxList
                            .filter((t) => {
                              const gstMode = getGstMode();

                              // show all if party not selected
                              if (!gstMode) return true;

                              // INTRA → CGST + SGST
                              if (gstMode === "INTRA") {
                                return (
                                  Number(t.cgst_percent) > 0 &&
                                  Number(t.sgst_percent) > 0
                                );
                              }

                              // INTER → IGST
                              if (gstMode === "INTER") {
                                return Number(t.igst_percent) > 0;
                              }

                              return true;
                            })
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.tax_name}
                              </option>
                            ))}
                        </select>

                        <input
                          value={money(r.taxAmount).toFixed(2)}
                          readOnly
                          className="h-9 w-[120px] text-center border rounded px-2 bg-gray-50"
                        />
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td className="border p-2 text-right font-semibold w-[140px]">
                      {money(r.amount).toFixed(2)}
                    </td>

                    {/* DELETE */}
                    <td className="border p-2 text-center w-[70px]">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="h-8 w-8 rounded bg-red-100 text-red-700 hover:bg-red-200"
                        title="Delete row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}

                {/* ADD ROW */}
                <tr>
                  <td colSpan={totalCols} className="border p-3">
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
                  <td className="border p-2" colSpan={2}>
                    TOTAL
                  </td>

                  <td className="border p-2"></td>

                  {mode === "ITEM" && (
                    <>
                      <td className="border p-2 text-center">
                        {rows.reduce((s, r) => s + money(r.qty), 0)}
                      </td>
                      <td className="border p-2"></td>
                    </>
                  )}

                  <td className="border p-2"></td>

                  <td className="border p-2 text-center">
                    {money(
                      rows.reduce((s, r) => s + money(r.taxAmount), 0),
                    ).toFixed(2)}
                  </td>

                  <td className="border p-2 text-right">
                    {totalAmount.toFixed(2)}
                  </td>

                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PAYMENT SUMMARY */}
          <div className="p-4">
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-4">
              {/* Paid Amount */}

              <div className="lg:col-span-3">
                <FloatingInput
                  label="Paid Amount"
                  type="number"
                  value={paidAmount === 0 ? "" : paidAmount}
                  onChange={(e) => {
                    let val = e.target.value;

                    // ❌ negative block
                    if (Number(val) < 0) return;

                    setPaidAmount(val === "" ? 0 : Number(val));
                  }}
                />
              </div>
              {/* Due */}
              <div className="lg:col-span-3">
                <FloatingInput
                  label="Due"
                  value={dueAmount.toFixed(2)}
                  readOnly
                />
              </div>
              {/* Total */}
              <div className="lg:col-span-3">
                <FloatingInput
                  label="Total"
                  value={totalAmount.toFixed(2)}
                  readOnly
                />
              </div>
              {/* Payment Type */}

              <div className="lg:col-span-3">
                <FloatingSelect
                  label="Payment Type"
                  value={Number(paidAmount) === 0 ? "NONE" : paymentType}
                  disabled={Number(paidAmount) === 0}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaymentType(value);

                    // 🔁 reset dependent fields
                    if (value !== "BANK") {
                      setBankName("");
                      setPaymentMode("");
                      setChequeNumber("");
                      setChequeDate("");
                    }
                  }}
                  options={[
                    { value: "NONE", label: "None" },
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
                      ...bankList
                        .filter((bank) => bank.status === "active")
                        .map((bank) => ({
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
          </div>
        </div>

        <div className="p-4 border-t">
          <FloatingTextarea
            label="Narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            rows={3}
          />
        </div>

        <div
          className="p-4 border-t 
  flex flex-col sm:flex-row 
  sm:items-center sm:justify-end 
  gap-3"
        >
          {/* ❌ Edit mode me Save & Continue mat dikhao */}
          {!isEdit && (
            <button
              type="button"
              onClick={() => saveSale("continue")}
              disabled={savingType !== ""}
              className={`w-full sm:w-auto px-5 py-2 text-white rounded transition
      ${savingType !== ""
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {savingType === "continue" ? "Saving..." : "Save & Continue"}
            </button>
          )}

          <button
            type="button"
            onClick={() => saveSale("exit")}
            disabled={savingType !== ""}
            className={`w-full sm:w-auto px-5 py-2 text-white rounded transition
    ${savingType !== ""
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {savingType === "exit" ? "Saving..." : "Save & Exit"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/income/sales")}
            disabled={savingType !== ""}
            className={`w-full sm:w-auto px-4 py-2 border rounded transition
    ${savingType !== ""
                ? "bg-gray-100 cursor-not-allowed text-gray-400"
                : "hover:bg-gray-50"
              }`}
          >
            Cancel
          </button>
        </div>
      </div>

      {showModePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg border overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-gray-800">
              Change Voucher Mode
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  setMode("ITEM");
                  setShowModePopup(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 ${mode === "ITEM" ? "border-blue-600 bg-blue-50" : ""
                  }`}
              >
                <div className="font-semibold">Item Invoice</div>
                <div className="text-xs text-gray-600">
                  Item + Qty + Unit + HSN + Tax
                </div>
              </button>

              <button
                onClick={() => {
                  setMode("SERVICE");
                  setShowModePopup(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 ${mode === "SERVICE" ? "border-blue-600 bg-blue-50" : ""
                  }`}
              >
                <div className="font-semibold">Service Invoice</div>
                <div className="text-xs text-gray-600">
                  Service + HSN + Price + Tax (No Qty/Unit)
                </div>
              </button>
            </div>

            <div className="px-4 py-3 border-t flex justify-end">
              <button
                onClick={() => setShowModePopup(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50 text-sm"
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
