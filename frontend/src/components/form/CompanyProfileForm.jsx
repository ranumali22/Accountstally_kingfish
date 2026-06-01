import { useState } from "react";
import { createCompany } from "../../api";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, Mail, Phone, MapPin, Hash, Shield, Image as ImageIcon, CreditCard } from "lucide-react";

const FloatingInput = ({
  label,
  value = "",
  type = "text",
  readOnly = false,
  onChange,
  icon: Icon,
}) => {
  return (
    <div className="relative w-full group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#FF4200] transition-colors">
        {Icon && <Icon size={16} />}
      </div>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder=" "
        onChange={(e) => onChange?.(e.target.value)}
        className={`peer w-full h-[52px] rounded-xl border border-gray-200 bg-gray-50/30 ${Icon ? 'pl-10' : 'px-4'} pr-4 text-sm outline-none focus:border-[#FF4200] focus:bg-white focus:ring-4 focus:ring-[#FF4200]/5 transition-all`}
      />
      <label
        className={`absolute ${Icon ? 'left-10' : 'left-4'} -top-2.5 bg-white px-1.5 text-[11px] font-bold text-gray-500
        peer-placeholder-shown:top-[15px] peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal
        peer-placeholder-shown:text-gray-400
        peer-focus:-top-2.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-[#FF4200]
        transition-all pointer-events-none z-10`}
      >
        {label}
      </label>
    </div>
  );
};

const FloatingDate = ({ label, value, onChange }) => {
  return (
    <div className="relative w-full group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#FF4200] transition-colors z-10">
        <Calendar size={16} />
      </div>
      <DatePicker
        selected={value ? new Date(value) : null}
        onChange={(date) => onChange(date ? date.toISOString().split("T")[0] : "")}
        dateFormat="dd/MM/yyyy"
        placeholderText=" "
        className="w-full h-[52px] rounded-xl border border-gray-200 bg-gray-50/30 pl-10 pr-4 text-sm outline-none focus:border-[#FF4200] focus:bg-white focus:ring-4 focus:ring-[#FF4200]/5 transition-all"
      />
      <label className="absolute left-10 -top-2.5 bg-white px-1.5 text-[11px] font-bold text-[#FF4200] z-20">
        {label}
      </label>
    </div>
  );
};

const SectionHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-4 mt-2">
    <div className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
      {Icon && <Icon size={16} />}
    </div>
    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
    <div className="h-px bg-gray-100 flex-1 ml-2"></div>
  </div>
);

export default function CompanyProfile({ onSave }) {
  const [form, setForm] = useState({
    name: "",
    login_id: "",
    password: "",
    financial_year_start: "",
    financial_year_end: "",
    gst_enabled: 0,
    gst_number: "",
    pennumber: "",
    gst_state_code: "",
    address: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
    contact_no: "",
    email: "",
    opening_balance: 0,
    balance_type: "Cr",
    opening_date: "",
    logo: null,
    signature: null,
  });

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = async (value) => {
    handleChange("pincode", value);
    if (value.length !== 6) return;
    try {
      const res = await axios.get(`https://api.postalpincode.in/pincode/${value}`);
      const result = res.data?.[0];
      if (result?.Status === "Success" && result.PostOffice?.length) {
        const d = result.PostOffice[0];
        setForm((prev) => ({
          ...prev,
          country: d.Country || "",
          state: d.State || "",
          city: d.District || "",
        }));
      }
    } catch (e) {
      console.error("Pincode API error", e);
    }
  };

  const validateForm = () => {
    const required = {
      name: "Company Name",
      login_id: "Login ID",
      password: "Password",
      address: "Address",
      pincode: "Pincode",
      country: "Country",
      state: "State",
      city: "City",
    };
    if (!form.financial_year_start || !form.financial_year_end) {
      toast.error("Financial year dates are required");
      return false;
    }
    for (const k in required) {
      if (!form[k] || form[k].toString().trim() === "") {
        toast.error(`${required[k]} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      const fd = new FormData();
      Object.keys(form).forEach(key => {
        if (key !== 'logo' && key !== 'signature') {
          fd.append(key, form[key]);
        }
      });
      if (form.logo) fd.append("logo", form.logo);
      if (form.signature) fd.append("signature", form.signature);
      await createCompany(fd);
      toast.success("Company saved successfully");
      onSave?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="w-full bg-white">
      <div className="border-b px-8 py-5 flex items-center justify-between bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Create New Company</h2>
          <p className="text-xs text-gray-500 mt-0.5">Enter details to register a new company profile</p>
        </div>
        <div className="h-10 w-10 bg-[#FF4200]/10 rounded-full flex items-center justify-center text-[#FF4200]">
          <Shield size={20} />
        </div>
      </div>

      <div className="max-h-[75vh] overflow-y-auto p-8 space-y-10 custom-scrollbar">
        {/* Section 1: Basic Identity */}
        <section>
          <SectionHeader title="Basic Identity" icon={Shield} />
          <div className="space-y-5">
            <FloatingInput
              label="Company Legal Name"
              value={form.name}
              onChange={(v) => handleChange("name", v)}
              icon={Shield}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FloatingDate
                label="Financial Year Start"
                value={form.financial_year_start}
                onChange={(v) => handleChange("financial_year_start", v)}
              />
              <FloatingDate
                label="Financial Year End"
                value={form.financial_year_end}
                onChange={(v) => handleChange("financial_year_end", v)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FloatingInput
                label="Login ID"
                value={form.login_id}
                onChange={(v) => handleChange("login_id", v)}
                icon={Hash}
              />
              <FloatingInput
                label="Access Password"
                type="password"
                value={form.password}
                onChange={(v) => handleChange("password", v)}
                icon={Shield}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Contact & Taxation */}
        <section>
          <SectionHeader title="Contact & Taxation" icon={Mail} />
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FloatingInput
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(v) => handleChange("email", v)}
                icon={Mail}
              />
              <FloatingInput
                label="Contact Number"
                value={form.contact_no}
                onChange={(v) => handleChange("contact_no", v)}
                icon={Phone}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FloatingInput
                label="GST Number"
                value={form.gst_number}
                onChange={(v) => handleChange("gst_number", v)}
                icon={CreditCard}
              />
              <FloatingInput
                label="PAN Card Number"
                value={form.pennumber}
                onChange={(v) => handleChange("pennumber", v)}
                icon={CreditCard}
              />
              <FloatingInput
                label="GST State Code"
                value={form.gst_state_code}
                onChange={(v) => handleChange("gst_state_code", v)}
                icon={Hash}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Location Details */}
        <section>
          <SectionHeader title="Location Details" icon={MapPin} />
          <div className="space-y-5">
            <div className="relative group">
              <textarea
                rows="3"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder=" "
                className="peer w-full rounded-xl border border-gray-200 bg-gray-50/30 px-4 py-4 text-sm outline-none focus:border-[#FF4200] focus:bg-white focus:ring-4 focus:ring-[#FF4200]/5 transition-all"
              />
              <label className="absolute left-4 -top-2.5 bg-white px-1.5 text-[11px] font-semibold text-[#FF4200] transition-all">
                Full Office Address
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FloatingInput label="Country" value={form.country} readOnly icon={MapPin} />
              <FloatingInput label="State" value={form.state} readOnly icon={MapPin} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FloatingInput label="City" value={form.city} readOnly icon={MapPin} />
              <FloatingInput
                label="Pincode"
                value={form.pincode}
                onChange={(v) => handlePincodeChange(v.replace(/\D/g, ""))}
                icon={Hash}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Accounts & Branding */}
        <section>
          <SectionHeader title="Accounts & Branding" icon={CreditCard} />
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FloatingInput
                label="Opening Balance"
                type="number"
                value={form.opening_balance}
                onChange={(v) => handleChange("opening_balance", v)}
                icon={CreditCard}
              />
              <div className="relative group">
                <label className="absolute -top-2.5 left-4 bg-white px-1.5 text-[11px] font-semibold text-[#FF4200] z-10">Balance Type</label>
                <select
                  value={form.balance_type}
                  onChange={(e) => handleChange("balance_type", e.target.value)}
                  className="w-full h-[52px] rounded-xl border border-gray-200 bg-gray-50/30 px-4 text-sm outline-none focus:border-[#FF4200] focus:bg-white focus:ring-4 focus:ring-[#FF4200]/5 transition-all appearance-none"
                >
                  <option value="Cr">Credit (Cr)</option>
                  <option value="Dr">Debit (Dr)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within:text-[#FF4200]">
                  ▼
                </div>
              </div>
              <FloatingDate
                label="Opening Date"
                value={form.opening_date}
                onChange={(v) => handleChange("opening_date", v)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative p-5 border border-dashed rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors border-gray-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-[#FF4200]">
                    <ImageIcon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700">Company Logo</h4>
                    <p className="text-[10px] text-gray-500">Max size 2MB (PNG/JPG)</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#FF4200]/10 file:text-[#FF4200] hover:file:bg-[#FF4200]/20"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 2 * 1024 * 1024) handleChange("logo", file);
                  }}
                />
              </div>

              <div className="relative p-5 border border-dashed rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors border-gray-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700">Company Signature</h4>
                    <p className="text-[10px] text-gray-500">Authorized sign image</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 2 * 1024 * 1024) handleChange("signature", file);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            className="px-8 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 rounded-xl bg-[#FF4200] text-white font-bold shadow-lg shadow-[#FF4200]/20 hover:bg-[#e63900] hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Save Company Details
          </button>
        </div>
      </div>
    </div>
  );
}
