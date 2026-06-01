import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Upload } from "lucide-react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getPurchaseById } from "../../../api";
import {
  searchParty,
  createParty,
  createPurchase,
  updatePurchase,
  getAllTax,
  getAllUnits,
  fetchPincodeDetails,
  fetchItems,
  createItem,
  getBanks,
  getGstList,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";
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
        // onChange={(date) => onChange(date.toISOString().split("T")[0])}
        onChange={(date) => {
          if (!date) return;

          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");

          onChange(`${year}-${month}-${day}`);
        }}
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
  disabled = false, // ✅ add this
}) => {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled} // ✅ add this
        className={`peer h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition
          ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
          ${
            error
              ? "border-red-500 focus:border-red-500"
              : "border-gray-800 focus:border-[#FF4200]"
          }
        `}
      >
        <option value="" disabled>
          Select {label}
        </option>

        {options.map((op) => (
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
          peer-placeholder-shown:
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

export default function PurchageForm() {
  const isHydratingRef = React.useRef(false);
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const isEdit = urlParams.get("mode") === "edit";
  const urlMode = new URLSearchParams(window.location.search).get("mode");
  const [editLoaded, setEditLoaded] = useState(false);
  const [purchaseBillFile, setPurchaseBillFile] = useState(null);
  const [purchaseBillPreview, setPurchaseBillPreview] = useState("");
  const [date, setDate] = useState(new Date());
  const [mode, setMode] = useState("SERVICE");
  const [showModePopup, setShowModePopup] = useState(false);
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;
  const companyState = companyData.state || "";
  const [savingType, setSavingType] = useState("");

  const getTodayLocal = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [billDate, setBillDate] = useState(getTodayLocal());
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [gstStates, setGstStates] = useState([]);
  const [gstMasterList, setGstMasterList] = useState([]);
  const [narration, setNarration] = useState("");
  const [partyName, setPartyName] = useState("");
  const [itemList, setItemList] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [bankList, setBankList] = useState([]);
  const [partyGst, setPartyGst] = useState("");
  const [partyState, setPartyState] = useState("");
  const [partyCity, setPartyCity] = useState("");
  const [partyPincode, setPartyPincode] = useState("");
  const [partyList, setPartyList] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [taxReady, setTaxReady] = useState(false);
  const [bankName, setBankName] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [unitList, setUnitList] = useState([]);
  const [taxList, setTaxList] = useState([]);
  const [paidAmount, setPaidAmount] = useState("0");
  const [tdsPercent, setTdsPercent] = useState("");
  const [tdsAmount, setTdsAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("");
  const [editBill, setEditBill] = useState(null);
  const [partyDisplayName, setPartyDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [unitRes, taxRes, itemRes] = await Promise.all([
          getAllUnits(),
          getAllTax(),
          fetchItems(),
        ]);

        setUnitList(unitRes.data?.data || []);
        setTaxList(taxRes.data?.data || []);
        setTaxReady(true);
        setItemList(itemRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load unit/tax masters", err);
      }
    };

    fetchMasters();
  }, []);

  const [rows, setRows] = useState([
    {
      item: "",
      hsn: "",
      qty: 1,
      unit: "",
      showItemDropdown: false, // 👈 ADD,
      priceType: "WITHOUT_TAX",
      pricePerUnit: 0,
      taxType: "",
      taxPercent: 0,
      taxAmount: 0,
      amount: 0,
    },
  ]);

  useEffect(() => {
    const close = () => setShowPartyDropdown(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const money = (v) => Number(v || 0);

  useEffect(() => {
    const fetchGst = async () => {
      try {
        const res = await getGstList({ company_id: companyId });
        setGstMasterList(res.data.data || []);
      } catch (err) {
        console.error("GST master fetch failed", err);
      }
    };

    fetchGst();
  }, [companyId]);

  useEffect(() => {
    if (!isEdit || !id) return;

    isHydratingRef.current = true;

    getPurchaseById(id).then((res) => {
      const { header, items } = res.data;

      // 🔹 basic
      setEditBill({ id });
      setMode(header.mode || "ITEM");

      if (header.voucher_date) {
        const dateStr = header.voucher_date.slice(0, 10);

        const [year, month, day] = dateStr.split("-");

        const localDate = new Date(year, month - 1, day);

        setDate(localDate);
        setBillDate(dateStr);
      }

      setSelectedPartyId(header.party_id);
      setPartyName(header.party_name || "");
      setPartySearch(header.party_name || "");
      setPartyPhone(header.phone || "");
      setPartyAddress(header.address || "");
      setPartyCity(header.city || "");
      setPartyState(header.state || "");
      setPartyPincode(header.pincode || "");
      setPartyGst(header.gst_number || "");

      // 🔹 invoice
      setSupplierInvoiceNo(header.supplier_invoice_no || "");
      setPaidAmount(String(header.paid_amount || ""));
      setNarration(header.narration || "");

      setTdsPercent(header.tds_percent || "");
      setTdsAmount(header.tds_amount || 0);
      setPaymentType(header.payment_type || "");
      setPaymentMode(header.payment_mode || "");
      setBankName(header.bank_name || "");
      setChequeNumber(header.cheque_number || "");
      setChequeDate(header.cheque_date || "");

      // 🔹 rows

      setRows(
        items.map((r) => {
          const taxPercent = Number(r.tax_percent || 0);

          return {
            id: r.id,
            item: r.item_name || "Service",
            hsn: r.hsn || "",
            qty: Number(r.qty || 1),
            unit: r.unit_id || "",
            showItemDropdown: false,
            priceType: r.price_type || "WITHOUT_TAX",
            pricePerUnit: Number(r.price_per_unit || 0),
            taxType: r.tax_id ? String(r.tax_id) : "NONE",
            taxPercent,
            taxAmount: Number(r.tax_amount || 0),
            amount: Number(r.amount || 0),
          };
        }),
      );

      // 🔹 document preview
      if (header.document) {
        setPurchaseBillPreview(
          `${import.meta.env.VITE_SERVER_URL}/${header.document}`,
        );
      }

      setEditLoaded(true);

      setTimeout(() => {
        isHydratingRef.current = false;
      }, 0);
    });
  }, [isEdit, id]);

  useEffect(() => {
    if (!partySearch.trim() || !companyId) {
      setPartyList([]);
      return;
    }

    const controller = new AbortController();

    searchParty({
      q: partySearch,
      company_id: companyId,
    })
      .then((res) => {
        setPartyList(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (err.name !== "CanceledError") console.error(err);
      });

    return () => controller.abort();
  }, [partySearch, companyId]);

  useEffect(() => {
    if (money(paidAmount) === 0) {
      setPaymentType("");
      setPaymentMode("");
      setBankName("");
    }
  }, [paidAmount]);

  const selectParty = (p) => {
    const display = `${p.company_name} [${p.ledger_number}]`;

    setSelectedPartyId(p.id);
    setPartySearch(display); // 👈 input box me dikhta hai
    setPartyName(p.company_name); // 👈 backend ke liye clean name
    setPartyPhone(p.mobile_number || p.phone || "");
    setPartyGst(p.gst_number || p.gst || "");
    setPartyAddress(p.address || "");
    setPartyState(p.state || "");
    setPartyCity(p.city || "");
    setPartyPincode(p.pincode || "");

    setShowPartyDropdown(false);
  };

  const recalcRow = (row) => {
    const qty = mode === "ITEM" ? money(row.qty) : 1;
    const price = money(row.pricePerUnit);
    const base = qty * price;
    const taxPercent = money(row.taxPercent);

    let taxAmount = 0;
    let amount = 0;

    if (row.priceType === "WITH_TAX") {
      taxAmount = 0;
      amount = base;
    } else {
      taxAmount = (base * taxPercent) / 100;
      amount = base + taxAmount;
    }

    return {
      ...row,
      taxAmount: Number(taxAmount.toFixed(2)),
      amount: Number(amount.toFixed(2)),
    };
  };

  const updateRow = (index, key, value) => {
    setRows((prev) => {
      const newRows = [...prev];
      const r = { ...newRows[index], [key]: value };

      // 🔒 EDIT PREFILL TIME → NO RECALC
      if (isEdit && isHydratingRef.current) {
        newRows[index] = r;
        return newRows;
      }

      if (key === "taxType") {
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

      const qty = mode === "ITEM" ? money(r.qty) : 1;
      const price = money(r.pricePerUnit);
      const base = qty * price;
      const taxPercent = money(r.taxPercent);

      let taxAmount = 0;
      let amount = 0;

      // if (r.priceType === "WITH_TAX") {
      //   const baseWithoutTax = base / (1 + taxPercent / 100);
      //   taxAmount = base - baseWithoutTax;
      //   amount = base;
      // } else {
      //   taxAmount = (base * taxPercent) / 100;
      //   amount = base + taxAmount;
      // }

      if (r.priceType === "WITH_TAX") {
        taxAmount = 0;
        amount = base;
      } else {
        taxAmount = (base * taxPercent) / 100;
        amount = base + taxAmount;
      }

      r.taxAmount = Number(taxAmount.toFixed(2));
      r.amount = Number(amount.toFixed(2));

      newRows[index] = r;
      return newRows;
    });
  };

  const normalize = (s) => (s || "").toString().toLowerCase().trim();

  const getGstMode = () => {
    const cState = normalize(companyState);
    const pState = normalize(partyState);

    // 🔥 1️⃣ GST MASTER (ACTIVE ONLY)
    const gstStates = gstMasterList
      .filter((g) => g.delete_status === "show") // ✅ IMPORTANT
      .map((g) => normalize(g.state));

    if (pState && gstStates.includes(pState)) {
      console.log("GST MASTER MATCH");
      return "INTRA";
    }

    // 🔥 2️⃣ COMPANY FALLBACK
    if (cState && pState && cState === pState) {
      console.log("COMPANY MATCH");
      return "INTRA";
    }

    return "INTER";
  };

  const addRow = () => {
    const gstMode = getGstMode();

    let defaultTax = null;

    if (gstMode === "INTRA") {
      defaultTax = taxList.find(
        (t) => Number(t.cgst_percent) > 0 && Number(t.sgst_percent) > 0,
      );
    } else if (gstMode === "INTER") {
      defaultTax = taxList.find((t) => Number(t.igst_percent) > 0);
    }

    let taxPercent = 0;

    if (defaultTax) {
      if (gstMode === "INTRA") {
        taxPercent =
          Number(defaultTax.cgst_percent || 0) +
          Number(defaultTax.sgst_percent || 0);
      } else if (gstMode === "INTER") {
        taxPercent = Number(defaultTax.igst_percent || 0);
      }
    }

    setRows((prev) => [
      ...prev,

      recalcRow({
        item: "",
        hsn: "",
        qty: 1,
        unit: "",
        showItemDropdown: false,

        priceType: "WITHOUT_TAX",
        pricePerUnit: 0,

        taxType: defaultTax?.id || "",
        taxPercent,

        taxAmount: 0,
        amount: 0,
      }),
    ]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + money(r.amount), 0);
  }, [rows]);

  const dueAmount = useMemo(() => {
    const due = totalAmount - money(paidAmount);
    return due < 0 ? 0 : due;
  }, [totalAmount, paidAmount]);

  // useEffect(() => {
  //   const percent = Number(tdsPercent || 0);

  //   const gstAmount = rows.reduce(
  //     (sum, r) => sum + Number(r.taxAmount || 0),
  //     0,
  //   );

  //   const taxableAmount = totalAmount - gstAmount;

  //   const amount = (taxableAmount * percent) / 100;

  //   setTdsAmount(Number(amount.toFixed(2)));
  // }, [tdsPercent, totalAmount, rows]);

  useEffect(() => {
    // ❌ edit mode me override mat karo
    if (isEdit && isHydratingRef.current) return;

    const percent = Number(tdsPercent || 0);

    const gstAmount = rows.reduce(
      (sum, r) => sum + Number(r.taxAmount || 0),
      0,
    );

    const taxableAmount = totalAmount - gstAmount;

    const amount = (taxableAmount * percent) / 100;

    setTdsAmount(Number(amount.toFixed(2)));
  }, [tdsPercent, totalAmount, rows]);

  useEffect(() => {
    if (isEdit && editLoaded) return;
    if (!rows.length || taxList.length === 0) return;

    const gstMode = getGstMode();

    let defaultTax = null;

    if (!gstMode) {
      defaultTax = taxList.find((t) => t.tax_type === "NONE");
    } else if (gstMode === "INTRA") {
      defaultTax = taxList.find((t) => t.tax_type === "GST");
    } else if (gstMode === "INTER") {
      defaultTax = taxList.find((t) => t.tax_type === "IGST");
    }

    if (!defaultTax) return;

    setRows((prev) =>
      prev.map((r) => {
        if (r.taxType) return r;

        return recalcRow({
          ...r,
          taxType: defaultTax.id,
          taxPercent:
            gstMode === "INTRA"
              ? Number(defaultTax.cgst_percent || 0) +
                Number(defaultTax.sgst_percent || 0)
              : gstMode === "INTER"
                ? Number(defaultTax.igst_percent || 0)
                : 0,
        });
      }),
    );
  }, [partyState, companyState, taxList, isEdit, editLoaded]);

  useEffect(() => {
    if (isEdit && editLoaded) return;
    if (!rows.length || rows[0].taxType || taxList.length === 0) return;

    const gstMode = getGstMode();
    let defaultTax = null;

    if (gstMode === "INTRA") {
      defaultTax = taxList.find((t) => t.tax_type === "GST");
    } else if (gstMode === "INTER") {
      defaultTax = taxList.find((t) => t.tax_type === "IGST");
    }

    if (defaultTax) {
      setRows((prev) => [
        recalcRow({
          ...prev[0],
          taxType: defaultTax.id,
          taxPercent: Number(defaultTax.tax_percent || 0),
        }),
        ...prev.slice(1),
      ]);
    }
  }, [partyState, taxList, isEdit, editLoaded]);

  const totalCols = mode === "ITEM" ? 9 : 7;

  const resetForm = () => {
    setSupplierInvoiceNo("");
    setNarration("");
    setPaidAmount("");
    setPaymentType("");

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

  const handleSelectPurchaseBill = (file) => {
    if (!file) return;

    setPurchaseBillFile(file);

    // preview only for images
    if (file.type.startsWith("image/")) {
      setPurchaseBillPreview(URL.createObjectURL(file));
    } else {
      setPurchaseBillPreview("");
    }
  };

  const removePurchaseBill = () => {
    setPurchaseBillFile(null);
    setPurchaseBillPreview("");
  };

  const savePurchase = async (action) => {
    if (isSaving) return;
    setSavingType(action);
    setIsSaving(true);

    if (!supplierInvoiceNo || !supplierInvoiceNo.trim()) {
      showError("Supplier Invoice Number is required");
      setSavingType("");
      setIsSaving(false);
      return;
    }

    if (!partyName.trim()) {
      showError("Party A/c name required");
      setSavingType("");
      setIsSaving(false);
      return;
    }

    const validRows = rows.filter((r) => {
      if (!r.item.trim()) return false;
      if (mode === "ITEM") {
        return money(r.qty) > 0 && money(r.pricePerUnit) > 0;
      }
      return money(r.pricePerUnit) > 0;
    });

    if (validRows.length === 0) {
      showError("Please add minimum 1 row");
      setSavingType("");
      setIsSaving(false);
      return;
    }

    if (money(paidAmount) > 0 && !paymentType) {
      showError("Please select payment type");
      setSavingType("");
      setIsSaving(false);
      return;
    }

    let partyId = selectedPartyId;

    try {
      /* ================= PARTY LOGIC ================= */

      if (!partyId) {
        const cleanPhone = String(partyPhone || "").replace(/\D/g, "");

        // ❌ Mobile required
        if (!cleanPhone) {
          showError("Contact number required for new party");
          setSavingType("");
          setIsSaving(false);
          return;
        }

        if (!partyPincode) {
          showError("partyPincode  required for new party");
          setSavingType("");
          setIsSaving(false);
          return;
        }

        // ❌ Must be valid Indian mobile (6–9 start + 10 digit)
        const isValidIndianMobile = /^[6-9]\d{9}$/;

        if (!isValidIndianMobile.test(cleanPhone)) {
          showError("Invalid phone number (must start with 6-9 and be 10 digits)");
          setSavingType("");
          setIsSaving(false);
          return;
        }

        // ✅ STRONG DUPLICATE CHECK
        const match = partyList.find((p) => {
          const dbPhone = String(p.mobile_number || "").replace(/\D/g, "");

          return (
            p.company_name?.trim().toLowerCase() ===
              partyName.trim().toLowerCase() ||
            (partyGst && p.gst_number === partyGst) ||
            (cleanPhone && dbPhone === cleanPhone)
          );
        });

        if (match) {
          // ✅ existing party use karo
          partyId = match.id;
        } else {
          // ✅ new party create karo
          const res = await createParty({
            company_id: companyId,
            company_name: partyName,
            mobile_number: cleanPhone,
            gst_number: partyGst,
            address: partyAddress,
            state: partyState,
            city: partyCity,
            pincode: partyPincode,
          });

          partyId = res.data.id;
        }
      }

      /* ================= DEBUG ================= */
      console.group("🧍 FINAL PARTY DETAILS");
      console.log({
        partyId,
        partyName,
        partyPhone,
        partyGst,
        partyAddress,
        partyCity,
        partyState,
        partyPincode,
      });
      console.groupEnd();

      /* ================= PAYLOAD ================= */

      const formData = new FormData();
      if (isEdit) {
        formData.append("id", id); // ✅ only for update
      }
      formData.append("company_id", companyId);
      formData.append("supplier_invoice_no", supplierInvoiceNo);
      formData.append("voucher_date", billDate);
      formData.append("mode", mode);
      formData.append("party_id", partyId);
      formData.append("narration", narration || "");
      formData.append("total_amount", totalAmount.toFixed(2));
      formData.append("due_amount", dueAmount.toFixed(2));
      formData.append("paid_amount", money(paidAmount).toFixed(2));

      /* ================= PAYMENT ================= */

      if (money(paidAmount) > 0) {
        formData.append("payment_type", paymentType || "");

        if (paymentType === "BANK") {
          formData.append("payment_mode", paymentMode || "");
          formData.append("bank_name", bankName || "");

          if (paymentMode === "CHEQUE") {
            formData.append("cheque_number", chequeNumber || "");
            formData.append("cheque_date", chequeDate || "");
          }
        }
      }

      /* ================= TDS ================= */

      const gstAmount = validRows.reduce(
        (sum, r) => sum + Number(r.tax_amount || 0),
        0,
      );

      const taxableAmount = totalAmount - gstAmount;

      formData.append("tds_percent", Number(tdsPercent || 0));
      formData.append("tds_on_amount", taxableAmount.toFixed(2));
      formData.append("tds_amount", Number(tdsAmount || 0));

      /* ================= ROWS ================= */

      formData.append(
        "rows",
        JSON.stringify(
          validRows.map((r) => ({
            id: r.id || null,
            row_type: mode,
            item_name: r.item?.trim() || "Service",
            hsn: r.hsn || null,
            qty: mode === "ITEM" ? money(r.qty) : null,
            unit_id: mode === "ITEM" ? r.unit || null : null,
            price_type: r.priceType,
            tax_id: r.taxType && r.taxType !== "NONE" ? r.taxType : null,
            price_per_unit: money(r.pricePerUnit),
            tax_percent: money(r.taxPercent),
            tax_amount: money(r.taxAmount),
            amount: money(r.amount),
          })),
        ),
      );

      /* ================= DOCUMENT ================= */

      if (purchaseBillFile) {
        formData.append("document", purchaseBillFile);
      }

      /* ================= API ================= */
      const res2 = isEdit
        ? await updatePurchase(id, formData) // 👈 editBill.id hatao
        : await createPurchase(formData);

      if (!res2.data || res2.status !== 200) {
        throw new Error("Save failed");
      }

      showSuccess(isEdit ? "Purchase Updated ✅" : "Purchase Saved ✅");

      if (action === "continue") {
        resetForm();
      } else {
        navigate("/expense/purchase");
      }
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err.message ||
        "Something went wrong";

      showError(msg);
    } finally {
      setIsSaving(false);
      setSavingType(""); // 🔄 stop loading
    }
  };

  const selectItemForRow = (rowIndex, item) => {
    setRows((prev) => {
      const copy = [...prev];

      copy[rowIndex] = {
        ...copy[rowIndex],
        item: item.item_name,
        hsn: item.hsn_code || "",
        unit: mode === "ITEM" ? item.unit_id || "" : "", // ✅ FIX
        showItemDropdown: false,
      };

      return copy;
    });
  };

  const handleCreateItem = async (rowIndex) => {
    const r = rows[rowIndex];

    if (!r.item?.trim()) {
      showError("Enter item/service name first");
      return;
    }

    try {
      const payload = {
        item_name: r.item.trim(),
        hsn_code: r.hsn || null,
        unit_id: mode === "ITEM" ? r.unit || null : null, // ✅ service me null
        display_index: 0,
      };

      const res = await createItem(payload);

      if (res.data.success) {
        showSuccess("Item created successfully");

        // refresh item list
        const itemRes = await fetchItems();
        setItemList(itemRes.data?.data || []);
      }
    } catch (err) {
      console.error(err);
      showError("Item create failed");
    }
  };

  const totalBaseAmount = rows.reduce((sum, r) => {
    const qty = mode === "ITEM" ? money(r.qty) : 1;
    return sum + qty * money(r.pricePerUnit);
  }, 0);

  const totalTaxAmount = rows.reduce((s, r) => s + money(r.taxAmount), 0);

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
      <div className="bg-[#FFFFFF] border border-darkborder rounded-xl shadow-sm px-4 py-3 flex items-center justify-between mb-4 ">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/expense/purchase")}
            className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="font-semibold text-gray-800">Purchase</div>
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
        <div
          className="px-4 py-3 border-b 
                flex flex-col sm:flex-row 
              sm:items-center sm:justify-between gap-2"
        >
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold">
              Purchase
            </span>
            <span className="text-sm text-gray-600 required">
              Mode:{" "}
              <b className="text-gray-900">
                {mode === "ITEM" ? "Item Invoice" : "Service Invoice"}
              </b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FloatingDatePicker
              label="Date"
              required
              value={billDate}
              onChange={(d) => {
                setBillDate(d);

                const [year, month, day] = d.split("-");
                setDate(new Date(year, month - 1, day));
              }}
            />
          </div>
        </div>

        {/* PARTY SINGLE LINE */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-3 sm:col-span-1 relative">
              <FloatingInput
                label="Party Name"
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value); // input typing
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

            <div className="lg:col-span-3 sm:col-span-1">
              <FloatingInput
                label="GST Number"
                value={partyGst}
                onChange={(e) => setPartyGst(e.target.value.toUpperCase())}
              />
            </div>

            <div className="lg:col-span-3 sm:col-span-1">
              <FloatingInput
                label="Address"
                required
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
              />
            </div>

            <div className="lg:col-span-3 sm:col-span-1">
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

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3">
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
                label="Contact No."
                value={partyPhone}
                // onChange={(e) => setPartyPhone(e.target.value)}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // only digits

                  if (value.length <= 10) {
                    setPartyPhone(value);
                  }
                }}
              />
            </div>

            <div className="lg:col-span-3">
              <FloatingInput
                label="Supplier Invoice No."
                required
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
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
                  <th className="border p-2 w-12 text-center">Sr</th>

                  <th className="border p-2 text-left min-w-[200px]">
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

                    <td className="border p-2 text-center">
                      <input
                        value={r.hsn}
                        onChange={(e) => updateRow(i, "hsn", e.target.value)} // ✅ FIX
                        className="h-9 w-[100px] text-center border rounded px-2"
                        placeholder="HSN"
                      />
                    </td>

                    {mode === "ITEM" && (
                      <>
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

                        <td className="border p-2 text-center">
                          <select
                            value={r.unit}
                            onChange={(e) =>
                              updateRow(i, "unit", e.target.value)
                            }
                            className="h-9 w-[95px] border rounded px-2 bg-white"
                          >
                            <option value="">Unit</option>
                            {unitList.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.unit_name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </>
                    )}

                    <td className="border p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
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
                          value={r.pricePerUnit}
                          onChange={(e) =>
                            updateRow(i, "pricePerUnit", e.target.value)
                          }
                          className="h-9 w-[90px] text-center border rounded px-2"
                          placeholder="0.00"
                        />
                      </div>
                    </td>

                    <td className="border p-2">
                      <div className="flex items-center justify-center gap-2">
                        <select
                          value={r.taxType || "NONE"}
                          disabled={r.priceType === "WITH_TAX"}
                          onChange={(e) =>
                            updateRow(i, "taxType", e.target.value)
                          }
                          className="h-9 w-[110px] border rounded px-2 bg-white text-xs"
                        >
                          {/* 👇 DEFAULT NONE OPTION */}
                          <option value="NONE">None</option>

                          {taxList
                            .filter((t) => {
                              const gstMode = getGstMode();
                              if (!gstMode) return t.tax_type === "NONE";
                              if (gstMode === "INTRA")
                                return (
                                  Number(t.cgst_percent) > 0 &&
                                  Number(t.sgst_percent) > 0
                                );

                              if (gstMode === "INTER")
                                return Number(t.igst_percent) > 0;

                              return false;
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
                          className="h-9 w-[90px] text-center border rounded px-2 bg-gray-50"
                        />
                      </div>
                    </td>

                    <td className="border p-2 text-right font-semibold">
                      {money(r.amount).toFixed(2)}
                    </td>

                    <td className="border p-2 text-center">
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
                  <td colSpan={mode === "ITEM" ? 9 : 7} className="border p-3">
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
                      {/* QTY TOTAL */}
                      <td className="border p-2 text-center">
                        {rows.reduce((s, r) => s + money(r.qty), 0)}
                      </td>
                      <td className="border p-2"></td>
                    </>
                  )}

                  {/* ✅ Amount Total (NEW ADDITION) */}
                  <td className="border p-2 text-center">
                    {totalBaseAmount.toFixed(2)}
                  </td>

                  <td className="border p-2 text-center">
                    {totalTaxAmount.toFixed(2)}
                  </td>

                  <td className="border p-2 text-right">
                    {(totalBaseAmount + totalTaxAmount).toFixed(2)}
                  </td>

                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>
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
                  value={tdsAmount.toFixed(2)}
                  onChange={() => {}}
                  type="text"
                  readOnly
                />
              </div>
              {/* Paid Amount */}
              <div className="lg:col-span-3">
                <FloatingInput
                  label="Paid Amount"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  type="number"
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
                {/* <FloatingSelect
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
                /> */}

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
                  options={[
                    { value: "", label: "Select Payment Type" },
                    { value: "CASH", label: "Cash" },
                    { value: "BANK", label: "Bank" },
                  ]}
                  disabled={money(paidAmount) <= 0}
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
           flex flex-col lg:flex-row 
            lg:items-center lg:justify-between gap-4"
        >
          {/* LEFT: Upload Purchase Bill */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(e) => handleSelectPurchaseBill(e.target.files?.[0])}
              />

              <div className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm font-semibold flex items-center gap-2">
                <Upload size={16} />
                Upload Purchase Bill
              </div>
            </label>

            {/* File info + preview */}
            {(purchaseBillFile || purchaseBillPreview) && (
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-gray-50">
                <div className="text-sm">
                  <div className="font-semibold text-gray-800">
                    {purchaseBillFile
                      ? purchaseBillFile.name
                      : "Existing Purchase Bill"}
                  </div>

                  {purchaseBillFile && (
                    <div className="text-xs text-gray-500">
                      {(purchaseBillFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </div>

                {purchaseBillPreview && (
                  <img
                    src={
                      purchaseBillFile
                        ? URL.createObjectURL(purchaseBillFile)
                        : purchaseBillPreview
                    }
                    className="h-12 w-12 object-cover rounded border"
                  />
                )}

                <button
                  type="button"
                  onClick={removePurchaseBill}
                  className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            {/* SAVE & CONTINUE */}
            <button
              type="button"
              disabled={savingType !== ""}
              onClick={() => savePurchase("continue")}
              className={`w-full sm:w-auto px-5 py-2 rounded text-white flex items-center justify-center gap-2
    ${
      savingType !== ""
        ? "bg-blue-300 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }`}
            >
              {savingType === "continue" && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              {savingType === "continue" ? "Saving..." : "Save & Continue"}
            </button>

            {/* SAVE & EXIT */}
            <button
              type="button"
              disabled={savingType !== ""}
              onClick={() => savePurchase("exit")}
              className={`w-full sm:w-auto px-5 py-2 rounded text-white flex items-center justify-center gap-2
    ${
      savingType !== ""
        ? "bg-green-300 cursor-not-allowed"
        : "bg-green-600 hover:bg-green-700"
    }`}
            >
              {savingType === "exit" && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              )}
              {savingType === "exit" ? "Saving..." : "Save & Exit"}
            </button>

            {/* CANCEL */}
            <button
              type="button"
              disabled={savingType !== ""}
              onClick={() => navigate("/expense/purchase")}
              className={`w-full sm:w-auto px-5 py-2 border rounded 
    ${
      savingType !== "" ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
    }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* CHANGE MODE POPUP */}
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
                className={`w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 ${
                  mode === "ITEM" ? "border-blue-600 bg-blue-50" : ""
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
                className={`w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 ${
                  mode === "SERVICE" ? "border-blue-600 bg-blue-50" : ""
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
