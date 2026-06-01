import React, { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { showError, showSuccess } from "../../components/ui/alert/Alert";

const API_BASE = `${import.meta.env.VITE_SERVER_URL}/api`; // backend base url

const initialForm = {
  bankName: "",
  accountNo: "",
  holderName: "",
  ifsc: "",
  branch: "",
  upiId: "",
  openingBalance: "",
  balanceType: "Dr",
  openingDate: "",
  qrImage: "", // preview url
};

function Field({
  label,
  name,
  value,
  onChange,
  disabled,
  placeholder,
  type = "text",
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-xl border outline-none transition
        ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
        focus:ring-2 focus:ring-orange-200`}
      />
    </div>
  );
}

export default function BankForm() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // mode: add | edit | view
  const mode = state?.mode || "add";
  const selectedBank = state?.bank || null;

  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [qrFile, setQrFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 company_id from login / storage
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData?.id || null;
  // adjust if stored differently

  // ✅ On open (edit/view), fill form
  useEffect(() => {
    if ((isEdit || isView) && selectedBank) {
      setEditId(selectedBank.id);

      setForm({
        bankName: selectedBank.bank_name || "",
        accountNo: selectedBank.account_no || "",
        holderName: selectedBank.holder_name || "",
        ifsc: selectedBank.ifsc || "",
        branch: selectedBank.branch || "",
        upiId: selectedBank.upi_id || "",
        openingBalance: selectedBank.opening_balance || "",
        balanceType: selectedBank.balance_type || "Dr",
        openingDate: selectedBank.opening_date || "",
        qrImage: selectedBank.qr_image
          ? `${import.meta.env.VITE_SERVER_URL}/uploads/qr/${selectedBank.qr_image}`
          : "",
      });
    } else {
      setEditId(null);
      setForm(initialForm);
      setQrFile(null);
    }
  }, [isEdit, isView, selectedBank]);

  const qrValue = useMemo(() => {
    if (!form.upiId?.trim()) return "";
    return `upi://pay?pa=${encodeURIComponent(form.upiId)}&pn=${encodeURIComponent(
      form.holderName || "Account Holder",
    )}&cu=INR`;
  }, [form.upiId, form.holderName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, qrImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const downloadGeneratedQR = () => {
    try {
      const canvas = document.getElementById("upi-qr-canvas");
      if (!canvas) return;

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${form.bankName || "upi"}-qr.png`;
      link.click();
    } catch (err) {
      showError("QR download failed!");
    }
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.bankName.trim()) return showError("Bank Name required!");
    if (!form.accountNo.trim()) return showError("Account Number required!");
    if (!form.holderName.trim()) return showError("Holder Name required!");
    if (!companyId) return showError("Company ID missing!");

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("company_id", companyId);
      fd.append("bankName", form.bankName);
      fd.append("accountNo", form.accountNo);
      fd.append("holderName", form.holderName);
      fd.append("ifsc", form.ifsc || "");
      fd.append("branch", form.branch || "");
      fd.append("upiId", form.upiId || "");
      fd.append("opening_balance", Number(form.openingBalance) || 0);
      fd.append("balance_type", form.balanceType || "Dr");
      fd.append("opening_date", form.openingDate || "");

      if (qrFile) fd.append("qrImage", qrFile);

      const token = localStorage.getItem("company_token");
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      // ✅ ADD
      if (!isEdit) {
        await axios.post(`${API_BASE}/bank`, fd, config);
        showSuccess("Bank Saved Successfully ✅");
        navigate("/bank-table");
        return;
      }

      // ✅ EDIT
      if (isEdit) {
        if (!editId) return showError("Edit ID missing!");

        await axios.put(`${API_BASE}/bank/${editId}`, fd, config);
        showSuccess("Bank Updated Successfully ✅");
        navigate("/bank-table");
        return;
      }
    } catch (err) {
      console.error("Save error:", err);
      showError(err?.response?.data?.message || "Save failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="bg-white border rounded-2xl p-4 md:p-6">
        {/* Top */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Bank" : isView ? "View Bank" : "Add Bank"}
            </h1>
          </div>

          <button
            onClick={() => navigate("/bank-table")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white font-semibold"
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field
              label="Bank Name"
              name="bankName"
              value={form.bankName}
              onChange={handleChange}
              placeholder="Enter bank name"
              disabled={isView}
            />

            <Field
              label="Account Number"
              name="accountNo"
              value={form.accountNo}
              onChange={handleChange}
              placeholder="Enter account number"
              disabled={isView}
            />

            <Field
              label="Account Holder Name"
              name="holderName"
              value={form.holderName}
              onChange={handleChange}
              placeholder="Enter holder name"
              disabled={isView}
            />

            <Field
              label="IFSC Code"
              name="ifsc"
              value={form.ifsc}
              onChange={handleChange}
              placeholder="Enter IFSC"
              disabled={isView}
            />

            <Field
              label="Branch"
              name="branch"
              value={form.branch}
              onChange={handleChange}
              placeholder="Enter branch"
              disabled={isView}
            />

            <Field
              label="UPI ID"
              name="upiId"
              value={form.upiId}
              onChange={handleChange}
              placeholder="example@upi"
              disabled={isView}
            />

            <Field
              label="Opening Balance"
              name="openingBalance"
              value={form.openingBalance}
              onChange={handleChange}
              type="number"
              disabled={isView}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">
                Balance Type
              </label>
              <select
                name="balanceType"
                value={form.balanceType}
                onChange={handleChange}
                disabled={isView}
                className="w-full px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-orange-200"
              >
                <option value="Dr">Debit</option>
                <option value="Cr">Credit</option>
              </select>
            </div>

            <Field
              label="Opening Date"
              name="openingDate"
              value={form.openingDate}
              onChange={handleChange}
              type="date"
              disabled={isView}
            />
          </div>

          {/* QR Preview */}
          <div className="mt-6">
            <label className="text-sm font-semibold text-gray-700">
              QR Code (UPI)
            </label>

            <div className="mt-2 flex flex-col md:flex-row items-start gap-4">
              {/* Left */}
              <div className="border rounded-2xl p-3 bg-gray-50">
                {form.upiId?.trim() ? (
                  <QRCodeCanvas id="upi-qr-canvas" value={qrValue} size={170} />
                ) : (
                  <div className="w-[170px] h-[170px] flex items-center justify-center text-sm text-gray-500">
                    Enter UPI ID to generate QR
                  </div>
                )}

                {form.upiId?.trim() && !isView && (
                  <button
                    type="button"
                    onClick={downloadGeneratedQR}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold"
                  >
                    <Download size={16} /> Download QR
                  </button>
                )}
              </div>

              {/* Right */}
              <div className="flex-1 text-sm text-gray-600">
                <p className="font-semibold text-gray-800">QR Data:</p>

                <p className="break-all">{qrValue || "-"}</p>
                <p className="mt-2 text-xs text-gray-500">
                  * Enter UPI ID → QR auto generate here. Scan this QR to pay
                  using UPI apps
                </p>

                {/* Upload */}
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Upload QR Image
                  </p>

                  <div className="mt-2 flex flex-col sm:flex-row gap-3 items-start">
                    {!isView && (
                      <label className="cursor-pointer px-4 py-2 rounded-xl bg-[#FF4200] text-white text-sm font-semibold shadow">
                        Upload QR
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleQrUpload}
                        />
                      </label>
                    )}

                    {form.qrImage ? (
                      <div className="flex items-start gap-3">
                        <img
                          src={form.qrImage}
                          alt="Uploaded QR"
                          className="w-[170px] h-[170px] object-contain rounded-2xl border bg-white"
                        />

                        {!isView && (
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, qrImage: "" }));
                              setQrFile(null);
                            }}
                            className="px-3 py-2 rounded-xl border text-sm font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        * PNG/JPG upload kar sakte ho (optional)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex gap-3">
            {!isView && (
              <button
                type="reset"
                onClick={() => {
                  setForm(initialForm);
                  setQrFile(null);
                }}
                className="flex-1 py-3 rounded-xl border font-semibold"
              >
                Reset
              </button>
            )}

            {!isView ? (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#FF4200] text-white font-semibold shadow disabled:opacity-50"
              >
                {loading ? "Saving..." : isEdit ? "Update Bank" : "Save Bank"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/bank-table")}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold shadow"
              >
                Done
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
