import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Building2, MapPin, Globe, Calendar, BadgeCheck } from "lucide-react";

const API_BASE = `${import.meta.env.VITE_SERVER_URL}/api`;

import { useCompany } from "../../context/CompanyContext";

// ✅ THIS IS THE FIX
const FILE_BASE = import.meta.env.VITE_SERVER_URL;
export default function CompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({});

  const { updateCompany } = useCompany();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("company_token");

      if (!token) {
        toast.error("Please login again");
        return;
      }

      const res = await axios.get(`${API_BASE}/company/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setProfile(res.data.data);
        setForm({
          ...res.data.data,
          password: "",
        });
      } else {
        toast.error("Failed to load company profile");
      }
    } catch (err) {
      console.error("Company fetch failed:", err);
      toast.error("Session expired. Please login again.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FINAL LOGO URL FIX
  const logoUrl = profile?.logo
    ? `${FILE_BASE}/${profile.logo.replace(/\\/g, "/")}`
    : null;

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) return <p>No profile data</p>;

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("company_token");

      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        if (key === "password" && !form[key]) return;
        formData.append(key, form[key]);
      });

      const res = await axios.put(
        `${API_BASE}/company/${profile.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data.success) {
        toast.success("Profile updated successfully");
        updateCompany(res.data.data);

        setIsEdit(false);
        fetchProfile();
      }
    } catch (err) {
      toast.error("Update failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div className="bg-gradient-to-r from-[#22A586] to-[#1c8b70] rounded-2xl p-6 flex items-center gap-5 shadow-md">
        <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center shadow-md overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              className="object-contain h-full w-full"
              alt="Logo"
            />
          ) : (
            <Building2 size={36} className="text-gray-400" />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-white">{profile.name}</h2>
          <p className="text-white/80 text-sm mt-1">Company Profile Overview</p>
        </div>

        <button
          onClick={() => setIsEdit(!isEdit)}
          className="ml-auto bg-white text-[#22A586] px-5 py-2 rounded-xl font-medium shadow hover:scale-105 transition"
        >
          {isEdit ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {/* ================= CONTENT ================= */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-8">
        {!isEdit ? (
          <>
            {/* ===== BASIC INFO ===== */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Info label="Company Name" value={profile.name} />
                <Info label="Login ID" value={profile.login_id} />
                <Info label="GST Number" value={profile.gst_number || "-"} />
                <Info
                  label="GST Enabled"
                  value={profile.gst_enabled ? "Yes" : "No"}
                />
              </div>
            </div>

            {/* ===== FINANCIAL INFO ===== */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                Financial Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* <Info
                  label="Financial Year"
                  value={`${profile.financial_year_start} to ${profile.financial_year_end}`}
                /> */}

                <Info
                  label="Financial Year"
                  value={
                    profile.financial_year_start && profile.financial_year_end
                      ? `${new Date(profile.financial_year_start).toLocaleDateString("en-GB")} 
         to 
         ${new Date(profile.financial_year_end).toLocaleDateString("en-GB")}`
                      : "-"
                  }
                />

                <Info
                  label="Opening Balance"
                  value={`₹ ${Number(profile.opening_balance || 0).toLocaleString()} (${profile.balance_type})`}
                />
                {/* <Info label="Opening Date" value={profile.opening_date} /> */}

                <Info
                  label="Opening Date"
                  value={
                    profile.opening_date
                      ? new Date(profile.opening_date).toLocaleDateString(
                          "en-GB",
                        )
                      : "-"
                  }
                />
              </div>
            </div>

            {/* ===== ADDRESS ===== */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                Address Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Info label="City" value={profile.city} />
                <Info label="State" value={profile.state} />
                <Info label="Country" value={profile.country} />
                <Info label="Pincode" value={profile.pincode} />
                <Info label="Address" value={profile.address} full />
              </div>
            </div>

            {/* ===== BRANDING ===== */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                Branding
              </h3>

              <div className="flex gap-10">
                {profile.logo && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Company Logo</p>
                    <img
                      src={`${FILE_BASE}/${profile.logo.replace(/\\/g, "/")}`}
                      className="h-20 object-contain border rounded-lg p-2"
                    />
                  </div>
                )}

                {profile.signature && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Signature</p>
                    <img
                      src={`${FILE_BASE}/${profile.signature.replace(/\\/g, "/")}`}
                      className="h-20 object-contain border rounded-lg p-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ===== EDIT MODE ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input
                label="Company Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />

              <Input
                label="Login ID"
                value={form.login_id}
                onChange={(v) => setForm({ ...form, login_id: v })}
              />

              <Input
                label="New Password"
                type="password"
                value={form.password || ""}
                onChange={(v) => setForm({ ...form, password: v })}
              />

              <Input
                label="Financial Year Start"
                type="date"
                value={form.financial_year_start}
                onChange={(v) => setForm({ ...form, financial_year_start: v })}
              />

              <Input
                label="Financial Year End"
                type="date"
                value={form.financial_year_end}
                onChange={(v) => setForm({ ...form, financial_year_end: v })}
              />

              <Input
                label="City"
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
              />

              <Input
                label="State"
                value={form.state}
                onChange={(v) => setForm({ ...form, state: v })}
              />

              <Input
                label="Country"
                value={form.country}
                onChange={(v) => setForm({ ...form, country: v })}
              />

              <Input
                label="Pincode"
                value={form.pincode}
                onChange={(v) => setForm({ ...form, pincode: v })}
              />

              <Input
                label="GST Number"
                value={form.gst_number}
                onChange={(v) => setForm({ ...form, gst_number: v })}
              />

              <Input
                label="Opening Balance"
                type="number"
                value={form.opening_balance}
                onChange={(v) => setForm({ ...form, opening_balance: v })}
              />

              <Input
                label="Opening Date"
                type="date"
                value={form.opening_date}
                onChange={(v) => setForm({ ...form, opening_date: v })}
              />

              <Input
                label="Address"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
            </div>

            {/* ===== FILE UPLOAD SECTION ===== */}
            <div className="grid grid-cols-2 gap-8 mt-8">
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Upload Company Logo
                </p>

                <input
                  type="file"
                  onChange={(e) =>
                    setForm({ ...form, logo: e.target.files[0] })
                  }
                />

                {profile.logo && (
                  <img
                    src={`${FILE_BASE}/${profile.logo.replace(/\\/g, "/")}`}
                    className="h-16 mt-4 object-contain mx-auto"
                  />
                )}
              </div>

              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-500 mb-3">Upload Signature</p>

                <input
                  type="file"
                  onChange={(e) =>
                    setForm({ ...form, signature: e.target.files[0] })
                  }
                />

                {profile.signature && (
                  <img
                    src={`${FILE_BASE}/${profile.signature.replace(/\\/g, "/")}`}
                    className="h-16 mt-4 object-contain mx-auto"
                  />
                )}
              </div>
            </div>

            {/* ===== ACTION BUTTONS ===== */}
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setIsEdit(false);
                  setForm({
                    ...profile,
                    password: "",
                  });
                }}
                className="px-6 py-2 rounded-xl bg-gray-200 text-gray-700 font-medium"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdate}
                className="px-6 py-2 rounded-xl bg-[#22A586] text-white font-semibold shadow hover:opacity-90"
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= INFO COMPONENT ================= */

const Info = ({ label, value, icon, full }) => (
  <div className={`flex gap-3 items-start ${full ? "col-span-2" : ""}`}>
    <div className="mt-1 text-gray-600">{icon}</div>

    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="font-medium text-gray-800">{value || "-"}</p>
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = "text" }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-500 uppercase tracking-wide">
      {label}
    </label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2 focus:ring-2 focus:ring-[#22A586] outline-none"
    />
  </div>
);
