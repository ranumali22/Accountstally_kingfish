import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import {
  createPrefix,
  getPrefixes,
  updatePrefix,
  togglePrefixStatus,
} from "../../api";

import { showError } from "../../components/ui/alert/Alert";

function FloatingInput({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
}) {
  return (
    <div className="relative mb-3">
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange}
        className="peer w-full h-[44px] rounded-[10px] px-4 text-sm bg-white outline-none
        border border-gray-800 focus:border-[#FF4200]"
      />
      <label className="absolute left-4 -top-2 bg-white px-1 text-sm text-gray-800 peer-focus:text-[#FF4200]">
        {label}
      </label>
    </div>
  );
}

const FloatingSelect = ({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
}) => (
  <div className="relative mb-3">
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="peer w-full h-[44px] rounded-[10px] px-4 text-sm bg-white outline-none border border-gray-800 focus:border-[#FF4200]"
    >
      <option value="">Select {label}</option>

      {options.map((op, i) => (
        <option key={i} value={op}>
          {op}
        </option>
      ))}
    </select>

    <label className="absolute left-4 -top-2 bg-white px-1 text-sm text-gray-800">
      {label}
    </label>
  </div>
);

const voucherTypes = [
  "SALE",
  "EXPENSE",
  "JOURNAL_VOUCHER",
  "PAYMENT",
  "RECEIPT",
  "CN",
  "DN",
  "CASHBOOK",
  "CONTRA",
  "EMPLOYEE",
  "Thirdparty_Payment","Thirdparty_Receipt"
];

export default function PrefixMaster() {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const company = JSON.parse(localStorage.getItem("company_data"));
  const company_id = company?.id;

  /* LOAD DATA */
  const loadData = async () => {
    const res = await getPrefixes(company_id);
    setData(res.data);
    console.log("prifix data", res);
  };

  useEffect(() => {
    if (company_id) loadData();
  }, [company_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const rows = data.filter((row) =>
    row.prefix_name.toLowerCase().includes(search.toLowerCase()) ||
    row.voucher_type.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const paginatedRows = rows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleToggle = async (id) => {
    try {
      await togglePrefixStatus(id);
      loadData(); // reload after update
    } catch (err) {
      alert(err.response?.data?.message || "Error updating status");
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Prefix Master</h2>

          <div className="flex gap-3">
            <input
              placeholder="Search Prefix or Type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border px-3 py-2 rounded-md text-sm focus:outline-none focus:border-[#FF4200]"
            />
            <button
              onClick={() => {
                setEditRow(null);
                setOpen(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-700 transition"
            >
              + Add Type
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#5f5f5f] text-white text-sm">
              <tr>
                <th className="p-3 border">Sr No.</th>
                <th className="p-3 border">Voucher Type</th>
                <th className="p-3 border">Prefix</th>
                <th className="p-3 border">Start</th>
                <th className="p-3 border">Current</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    No prefixes found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, i) => (
                  <tr key={row.id} className="text-center hover:bg-gray-50 transition">
                    <td className="p-3 border">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td className="p-3 border font-semibold text-gray-800">{row.voucher_type}</td>
                    <td className="p-3 border">{row.prefix_name}</td>
                    <td className="p-3 border">{row.start_number}</td>
                    <td className="p-3 border">{row.current_number}</td>
                    <td className="p-3 border">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleToggle(row.id)}
                          className={`relative w-16 h-8 flex items-center rounded-full px-1 transition duration-300
                            ${row.is_active ? "bg-green-500" : "bg-red-500"}
                          `}
                        >
                          <span
                            className={`w-6 h-6 bg-white rounded-full shadow-md transform transition duration-300
                              ${row.is_active ? "translate-x-8" : "translate-x-0"}
                            `}
                          />
                          <span
                            className={`absolute text-[10px] font-semibold text-white
                              ${row.is_active ? "left-2" : "right-2"}
                            `}
                          >
                            {row.is_active ? "ON" : "OFF"}
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="p-3 border">
                      <button
                        onClick={() => {
                          setEditRow(row);
                          setOpen(true);
                        }}
                        className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition"
                      >
                        <Pencil size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50 flex-col sm:flex-row gap-3">
            <span className="text-sm text-gray-700">
              Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, rows.length)}</span> to{" "}
              <span className="font-semibold">{Math.min(currentPage * itemsPerPage, rows.length)}</span> of{" "}
              <span className="font-semibold">{rows.length}</span> entries
            </span>

            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`px-3 py-1.5 border rounded-md text-sm transition ${
                    currentPage === idx + 1
                      ? "bg-[#FF4200] text-white border-[#FF4200]"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {open && (
        <PopupForm
          editRow={editRow}
          company_id={company_id}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

/* ================= POPUP ================= */

function PopupForm({ editRow, company_id, onClose, onSuccess }) {
  const isEdit = Boolean(editRow);

  const [form, setForm] = useState({
    voucher_type: "",
    prefix_name: "",
    start_number: "",
    padding_length: 4,
    number_separator: "/",
  });

  useEffect(() => {
    if (isEdit) {
      setForm(editRow);
    }
  }, [editRow]);

  const submit = async () => {
    if (!form.voucher_type || !form.prefix_name)
      return showError("Fill required fields");

    if (isEdit) {
      await updatePrefix(editRow.id, form);
    } else {
      await createPrefix({ ...form, company_id });
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded w-[360px] shadow-lg">
        <h3 className="font-semibold mb-3">
          {isEdit ? "Edit Prefix" : "Add Prefix"}
        </h3>

        <div className="relative mb-3">
          <select
            value={form.voucher_type}
            disabled={isEdit}
            onChange={(e) =>
              setForm({
                ...form,
                voucher_type: e.target.value,
              })
            }
            className="peer w-full h-[44px] rounded-[10px] px-4 text-sm bg-white outline-none border border-gray-800 focus:border-[#FF4200]"
          >
            <option value="">Select Voucher Type</option>

            {voucherTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label className="absolute left-4 -top-2 bg-white px-1 text-sm text-gray-800">
            Voucher Type
          </label>
        </div>

        <FloatingInput
          label="Prefix"
          value={form.prefix_name}
          onChange={(e) =>
            setForm({
              ...form,
              prefix_name: e.target.value.toUpperCase(),
            })
          }
        />

        <FloatingInput
          label="Start Number"
          type="number"
          value={form.start_number}
          onChange={(e) => setForm({ ...form, start_number: e.target.value })}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="border px-3 py-1 rounded">
            Cancel
          </button>
          <button
            onClick={submit}
            className="bg-green-600 text-white px-3 py-1 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
