import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import {
  addShift,
  getShifts,
  updateShift,
  deleteShift,
  toggleShiftStatus,
} from "../../../api";
import { showError } from "../../../components/ui/alert/Alert";

/* ---------- helpers ---------- */

const formatDateTime = (date) => {
  const pad = (n) => n.toString().padStart(2, "0");

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/* ---------- floating field ---------- */

const FloatingField = ({ label, children }) => (
  <div className="relative w-full">
    {children}
    <label className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
      {label}
    </label>
  </div>
);

/* ---------- datetime picker ---------- */

const FloatingDateTimePicker = ({ label, value, onChange }) => {
  const handleChange = (date) => {
    if (!date) return;
    onChange(formatDateTime(date));
  };

  return (
    <div className="relative w-full">
      <DatePicker
        selected={value ? new Date(`1970-01-01T${value}`) : null}
        onChange={handleChange}
        showTimeSelect
        timeIntervals={5}
        timeCaption="Time"
        dateFormat="yyyy-MM-dd HH:mm:ss"
        popperPlacement="bottom-start"
        popperClassName="z-[9999]"
        placeholderText=" "
        className="peer w-full h-[42px] border border-gray-300 rounded-md px-3 text-sm focus:border-[#FF4200] outline-none"
      />

      <label className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
        {label}
      </label>
    </div>
  );
};

export default function ShiftMaster() {
  const [shifts, setShifts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    shift_name: "",
    shift_start_time: "",
    shift_end_time: "",
    display_order: 1,
    status: "active",
  });

  const fetchShifts = async () => {
    const res = await getShifts();
    setShifts(res?.data?.data || []);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    setEditId(null);
    setForm({
      shift_name: "",
      shift_start_time: "",
      shift_end_time: "",
      display_order: 1,
      status: "active",
    });
    setShowModal(true);
  };

  const handleEdit = (shift) => {
    setEditId(shift.id);

    setForm({
      shift_name: shift.shift_name || "",
      shift_start_time: shift.shift_start_time || "",
      shift_end_time: shift.shift_end_time || "",
      display_order: shift.display_order || 1,
      status: shift.status || "active",
    });

    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.shift_name.trim()) {
      showError("Shift name required");
      return;
    }

    if (!form.shift_start_time || !form.shift_end_time) {
      showError("Start and end time required");
      return;
    }

    if (new Date(form.shift_start_time) >= new Date(form.shift_end_time)) {
      showError("End time must be greater than start time");
      return;
    }

    try {
      if (editId) {
        await updateShift(editId, form);
      } else {
        await addShift(form);
      }

      setShowModal(false);
      fetchShifts();
    } catch (err) {
      showError(err?.response?.data?.message || "Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this shift?");
    if (!ok) return;

    await deleteShift(id);
    fetchShifts();
  };

  const handleStatus = async (shift) => {
    const status = shift.status === "active" ? "inactive" : "active";
    await toggleShiftStatus(shift.id, status);
    fetchShifts();
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* HEADER */}

      <div className="bg-white border rounded-lg p-4 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Shift Master</h2>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF4200] hover:bg-[#e63b00] text-white rounded text-sm shadow"
        >
          <FaPlus size={12} />
          Add Shift
        </button>
      </div>

      {/* TABLE */}

      <div className="bg-white border rounded-lg mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left">Sr No.</th>
              <th className="p-3 text-left">Shift Name</th>
              <th className="p-3 text-left">Start Time</th>
              <th className="p-3 text-left">End Time</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {shifts.length === 0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  No shifts found
                </td>
              </tr>
            )}

            {shifts.map((shift, i) => (
              <tr
                key={shift.id}
                className="border-t hover:bg-gray-50 transition duration-150"
              >
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{shift.shift_name}</td>
                <td className="p-3">{shift.shift_start_time}</td>
                <td className="p-3">{shift.shift_end_time}</td>

                {/* STATUS TOGGLE */}

                <td className="p-3">
                  <button
                    onClick={() => handleStatus(shift)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      shift.status === "active" ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        shift.status === "active"
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>

                <td className="p-3 flex items-center gap-3">
                  {/* EDIT */}

                  <button
                    onClick={() => handleEdit(shift)}
                    className="w-8 h-8 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-white rounded-md shadow-sm transition"
                  >
                    <FaEdit size={13} />
                  </button>

                  {/* DELETE */}

                  <button
                    onClick={() => handleDelete(shift.id)}
                    className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-md shadow-sm transition"
                  >
                    <FaTrash size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[520px] rounded-lg shadow-xl">
            {/* HEADER */}

            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 text-lg">
                {editId ? "Edit Shift" : "Add Shift"}
              </h3>

              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 text-lg"
              >
                ✕
              </button>
            </div>

            {/* FORM */}

            <div className="p-6 space-y-5">
              <FloatingField label="Shift Name">
                <input
                  name="shift_name"
                  value={form.shift_name}
                  onChange={handleChange}
                  placeholder=" "
                  className="peer w-full h-[42px] border border-gray-300 rounded-md px-3 text-sm focus:border-[#FF4200] outline-none"
                />
              </FloatingField>

              <FloatingDateTimePicker
                label="Shift Start Time"
                value={form.shift_start_time}
                onChange={(date) =>
                  setForm({ ...form, shift_start_time: date })
                }
              />

              <FloatingDateTimePicker
                label="Shift End Time"
                value={form.shift_end_time}
                onChange={(date) => setForm({ ...form, shift_end_time: date })}
              />

              <FloatingField label="Display Order">
                <input
                  type="number"
                  name="display_order"
                  value={form.display_order}
                  onChange={handleChange}
                  placeholder=" "
                  className="peer w-full h-[42px] border border-gray-300 rounded-md px-3 text-sm focus:border-[#FF4200] outline-none"
                />
              </FloatingField>
            </div>

            {/* FOOTER */}

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded text-sm"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-5 py-2 bg-green-600 text-white rounded text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
