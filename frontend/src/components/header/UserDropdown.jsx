import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

const API_BASE = import.meta.env.VITE_SERVER_URL;

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [company, setCompany] = useState(null);
  const navigate = useNavigate();

  /* ================= LOAD COMPANY DATA ================= */
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("company_token");
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/company/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          setCompany(data.data);

          // ✅ optional: localStorage sync bhi kar do
          localStorage.setItem("company_data", JSON.stringify(data.data));
        }
      } catch (err) {
        console.error("Dropdown fetch failed");
      }
    };

    fetchCompany();

    // 🔥 IMPORTANT: auto refresh every time page focus
    window.addEventListener("focus", fetchCompany);

    return () => window.removeEventListener("focus", fetchCompany);
  }, []);

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("token"); // ✅ unified key
    localStorage.removeItem("company_data");
    navigate("/login");
  };

  if (!company) return null;

  return (
    <div className="relative">
      {/* ================= BUTTON ================= */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 text-white focus:outline-none"
      >
        <img
          src={
            company.logo
              ? `${API_BASE}/${company.logo}`
              : "/images/user/default.png"
          }
          alt="Company Logo"
          className="h-10 w-10 rounded-full object-cover border bg-white"
        />

        <span className="font-medium">{company.name}</span>

        <svg
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          width="18"
          height="18"
          viewBox="0 0 18 20"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </button>

      {/* ================= DROPDOWN ================= */}
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 mt-4 w-[260px] rounded-xl bg-white shadow p-4 z-50"
      >
        {/* Company Info */}
        <div className="border-b pb-3 mb-3">
          <p className="font-semibold text-gray-800">{company.name}</p>
          <p className="text-sm text-gray-500">Login ID: {company.login_id}</p>
        </div>

        {/* Actions */}
        <DropdownItem>
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="block w-full"
          >
            Company Profile
          </Link>
        </DropdownItem>

        <DropdownItem onClick={logout}>Logout</DropdownItem>
      </Dropdown>
    </div>
  );
}
