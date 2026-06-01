import { useEffect, useState } from "react";
import { Pencil, Trash2, CheckCircle } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  createFinancialYear,
  getFinancialYears,
  updateFinancialYear,
  toggleFinancialYearStatus,
  setActiveFinancialYear,
  deleteFinancialYear,
} from "../../api";

/* ================= FLOATING INPUT ================= */
function FloatingInput({ label, value, disabled = false }) {
  return (
    <div className="relative mb-4">
      <input
        value={value}
        disabled={disabled}
        readOnly
        className="w-full h-[46px] rounded-lg px-4 text-sm bg-gray-100 outline-none
        border border-gray-300 cursor-not-allowed"
      />
      <label className="absolute left-3 -top-2 bg-white px-1 text-[11px] font-medium uppercase text-gray-500">
        {label}
      </label>
    </div>
  );
}

/* ================= FLOATING DATE PICKER ================= */
function FloatingDatePicker({ label, selected, onChange }) {
  return (
    <div className="relative mb-4">
      <DatePicker
        selected={selected}
        onChange={onChange}
        dateFormat="dd-MM-yyyy"

        /* ✅ UX IMPROVEMENTS */
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={15}

        /* ✅ UI FIX */
        popperPlacement="bottom-start"
        popperClassName="z-[9999]"
        portalId="root"
        withPortal

        className="w-full h-[46px] rounded-lg px-4 text-sm bg-white outline-none
        border border-gray-300 focus:border-[#FF4200] focus:ring-1 focus:ring-[#FF4200]/30"
      />

      <label className="absolute left-3 -top-2 bg-white px-1 text-[11px] font-medium uppercase text-gray-500">
        {label}
      </label>
    </div>
  );
}


const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
};

/* ================= MAIN COMPONENT ================= */
export default function FinancialYearMaster() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  /* ================= LOAD ================= */
  const loadFY = async () => {
    setLoading(true);
    try {
      const res = await getFinancialYears();
      setYears(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFY();
  }, []);

  /* ================= SAVE ================= */
  const saveFY = async (payload) => {
    if (editData) {
      await updateFinancialYear(editData.id, payload);
    } else {
      await createFinancialYear(payload);
    }
    setOpen(false);
    setEditData(null);
    loadFY();
  };

  /* ================= STATUS ================= */
  const toggleStatus = async (id) => {
    await toggleFinancialYearStatus(id);
    loadFY();
  };

  const makeActive = async (id) => {
    await setActiveFinancialYear(id);
    loadFY();
  };

  const removeFY = async (id) => {
    if (confirm("Are you sure you want to delete this Financial Year?")) {
      await deleteFinancialYear(id);
      loadFY();
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="bg-white rounded-xl shadow">
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Financial Year Master
            </h2>
            <p className="text-xs text-gray-500">
              Manage financial year configuration
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="bg-[#00A63E] hover:bg-[#e63b00] text-white px-4 py-2 rounded-md text-sm"
          >
            + Add Financial Year
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-300 border-collapse">
            <thead className="bg-[#5F5F5F] text-white">
              <tr>
                {[
                  "Sr No.",
                  "Financial Year",
                  "From",
                  "To",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="p-3 text-left font-medium border border-gray-300 bg-[#5F5F5F] text-white"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loading && years.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-500">
                    No Financial Year Found
                  </td>
                </tr>
              )}

              {years.map((fy, i) => (
                <tr key={fy.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 border border-gray-300">{i + 1}</td>
                  <td className="p-3 border border-gray-300 font-semibold">
                    {fy.financial_year}
                  </td>
                  <td className="p-3 border border-gray-300">
                    {formatDate(fy.from_date)}
                  </td>
                  <td className="p-3 border border-gray-300">
                    {formatDate(fy.to_date)}
                  </td>

                  <td className="p-3 border border-gray-300">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${fy.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                    >
                      {fy.status ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="p-3 border border-gray-300 flex gap-2 items-center">
                    <button
                      onClick={() => {
                        setEditData(fy);
                        setOpen(true);
                      }}
                      className="p-2 bg-blue-100 rounded"
                    >
                      <Pencil size={16} className="text-blue-600" />
                    </button>

                    {/* STATUS TOGGLE (SLIDER) */}
                    <button
                      onClick={() => toggleStatus(fy.id)}
                      className={`relative w-11 h-6 flex items-center rounded-full px-1 transition
      ${fy.status ? "bg-green-500" : "bg-red-500"}
    `}
                    >
                      <span
                        className={`w-4 h-4 bg-white rounded-full shadow-md transform transition
        ${fy.status ? "translate-x-5" : "translate-x-0"}
      `}
                      />
                      <span
                        className={`absolute text-[9px] font-semibold text-white
        ${fy.status ? "left-1.5" : "right-1.5"}
      `}
                      >
                        {fy.status ? "ON" : "OFF"}
                      </span>
                    </button>
                    {/* 
                    <button
                      onClick={() => makeActive(fy.id)}
                      className="p-2 bg-green-100 rounded"
                      title="Set Active"
                    >
                      <CheckCircle size={16} className="text-green-600" />
                    </button> */}

                    {/* <button
                      onClick={() => removeFY(fy.id)}
                      className="p-2 bg-red-100 rounded"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <FYPopup
          editData={editData}
          onClose={() => {
            setOpen(false);
            setEditData(null);
          }}
          onSave={saveFY}
        />
      )}
    </div>
  );
}

/* ================= POPUP ================= */
function FYPopup({ editData, onClose, onSave }) {
  const [fromDate, setFromDate] = useState(
    editData ? new Date(editData.from_date) : new Date(),
  );
  const [toDate, setToDate] = useState(
    editData ? new Date(editData.to_date) : new Date(),
  );

  const yearText = `${fromDate.getFullYear()}-${String(
    toDate.getFullYear(),
  ).slice(-2)}`;

  const submit = () => {
    onSave({
      from_date: fromDate.toISOString().slice(0, 10),
      to_date: toDate.toISOString().slice(0, 10),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-xl w-[380px] shadow-2xl">
        <h3 className="font-semibold text-gray-800 mb-4">
          {editData ? "Edit Financial Year" : "Add Financial Year"}
        </h3>

        <FloatingInput label="Financial Year" value={yearText} />

        <FloatingDatePicker
          label="From Date"
          selected={fromDate}
          onChange={setFromDate}
        />

        <FloatingDatePicker
          label="To Date"
          selected={toDate}
          onChange={setToDate}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="border px-4 py-2 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="bg-[#FF4200] text-white px-4 py-2 rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
