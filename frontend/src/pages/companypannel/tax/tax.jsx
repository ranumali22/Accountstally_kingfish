import { useEffect, useState, useMemo } from "react";
import { getAllTax, createTax, updateTax, deleteTax } from "../../../api";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";

const initialState = {
  tax_name: "",

  tax_percent: "",
  cgst_percent: 0,
  sgst_percent: 0,
  igst_percent: 0,
  is_active: 1,
};

export default function TaxMaster() {
  const [taxes, setTaxes] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(initialState);
  const [editId, setEditId] = useState(null);

  const loadTax = async () => {
    const res = await getAllTax();
    setTaxes(res.data.data);
  };

  useEffect(() => {
    loadTax();
  }, []);

  /* 🔥 AUTO TAX SPLIT */
  useEffect(() => {
    const percent = Number(form.tax_percent) || 0;

    setForm((prev) => ({
      ...prev,
      cgst_percent: percent / 2,
      sgst_percent: percent / 2,
      igst_percent: percent,
    }));
  }, [form.tax_percent]);

  const handleSubmit = async () => {
    if (!form.tax_name) return showError("Tax name required");

    editId ? await updateTax(editId, form) : await createTax(form);

    setShow(false);
    setForm(initialState);
    setEditId(null);
    loadTax();
  };

  const handleEdit = (tax) => {
    setForm({
      tax_name: tax.tax_name,
      tax_percent: tax.tax_percent,
      cgst_percent: tax.cgst_percent,
      sgst_percent: tax.sgst_percent,
      igst_percent: tax.igst_percent,
      is_active: tax.is_active,
    });

    setEditId(tax.id);
    setShow(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this tax?")) {
      await deleteTax(id);
      loadTax();
    }
  };

  const EyeIcon = ({ className }) => (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeWidth={1.5}
        d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EditIcon = ({ className }) => (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeWidth={1.5}
        d="M16.862 3.487a2.25 2.25 0 013.182 3.182L7.125 19.588l-4.5 1.318 1.318-4.5L16.862 3.487z"
      />
    </svg>
  );

  const TrashIcon = ({ className }) => (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeWidth={1.5}
        d="M6 7.5h12M9.75 7.5V6a2.25 2.25 0 012.25-2.25h0A2.25 2.25 0 0114.25 6v1.5M7.5 7.5l.75 12a2.25 2.25 0 002.25 2.25h3a2.25 2.25 0 002.25-2.25l.75-12"
      />
    </svg>
  );

  const handleView = (tax) => {
    setForm({
      tax_name: tax.tax_name,
      tax_percent: tax.tax_percent,
      cgst_percent: tax.cgst_percent,
      sgst_percent: tax.sgst_percent,
      igst_percent: tax.igst_percent,
      is_active: tax.is_active,
    });

    setEditId(null);
    setShow(true);
  };

  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalRecords = taxes.length;
  const totalPages = Math.ceil(totalRecords / perPage);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * perPage;
    return taxes.slice(start, start + perPage);
  }, [taxes, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [perPage]);

  return (
    <div className="p-6 min-h-screen">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow capitalize">
        <div className="p-4 flex flex-wrap items-center gap-3 justify-between border-b">
          <h1 className="text-xl font-semibold text-slate-800">Tax Master</h1>
          <button
            onClick={() => setShow(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            + Add Tax
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow border overflow-hidden capitalize">
          <table className="w-full bg-white border rounded">
            <thead className="bg-[#5f5f5f] text-white text-sm">
              <tr>
                <th className="p-2 border">#</th>

                <th className="px-4 py-3 border">Name</th>

                <th className="px-4 py-3 border">Rate</th>
                <th className="px-4 py-3 border">Status</th>
                <th className="px-4 py-3 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((t, i) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {(page - 1) * perPage + i + 1}
                  </td>

                  <td className="px-4 py-3   border">{t.tax_name}</td>

          <td  className="px-4 py-3   border">{parseFloat(t.tax_percent)} %</td>

                  <td className="px-4 py-3 border">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
          ${
            t.is_active
              ? "bg-green-100 text-green-700"
              : "bg-slate-200 text-slate-600"
          }`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3 text-center border">
                    <div className="inline-flex items-center gap-2">
                      {/* VIEW */}
                      <button
                        title="View"
                        onClick={() => handleView(t)}
                        className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        <Eye size={18} />
                      </button>

                      {/* EDIT */}
                      <button
                        title="Edit"
                        onClick={() => handleEdit(t)}
                        className={`p-2 rounded-md shadow-sm hover:scale-105 transition bg-blue-100 text-blue-600`}
                      >
                        <Pencil size={20} />
                      </button>

                      {/* DELETE */}
                      <button
                        title="Delete"
                        onClick={() => handleDelete(t.id)}
                        className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {taxes.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-500">
                    No tax records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
        <span className="text-sm text-gray-600">
          Showing {(page - 1) * perPage + 1} to{" "}
          {Math.min(page * perPage, totalRecords)} of {totalRecords}
        </span>

        <div className="flex items-center gap-2">
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>

          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            ◀
          </button>

          <span className="text-sm font-medium">
            {page} / {totalPages || 1}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            ▶
          </button>
        </div>
      </div>
      {/* MODAL */}
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-slate-800">
                {editId ? "Edit Tax" : "Add Tax"}
              </h2>
              <button
                onClick={() => setShow(false)}
                className="text-slate-400 hover:text-slate-700 text-xl"
              >
                ×
              </button>
            </div>

            {/* BODY */}
            <div className="px-6 py-5 space-y-5">
              {/* TAX NAME */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tax Name
                </label>
                <input
                  type="text"
                  value={form.tax_name}
                  onChange={(e) =>
                    setForm({ ...form, tax_name: e.target.value })
                  }
                  placeholder="e.g. GST @18%"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* TAX TYPE + RATE */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tax %
                  </label>
                  <input
                    type="number"
                    value={form.tax_percent}
                    onChange={(e) => {
                      const percent = e.target.value;

                      setForm({
                        ...form,
                        tax_percent: percent,
                      });
                    }}
                    placeholder="18"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
             focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* GST BREAKUP */}
              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Tax Breakup
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      CGST %
                    </label>
                    <input
                      value={form.cgst_percent}
                      disabled
                      className="w-full rounded-md bg-white border border-slate-200
                           px-3 py-2 text-sm text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      SGST %
                    </label>
                    <input
                      value={form.sgst_percent}
                      disabled
                      className="w-full rounded-md bg-white border border-slate-200
                           px-3 py-2 text-sm text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      IGST %
                    </label>
                    <input
                      value={form.igst_percent}
                      disabled
                      className="w-full rounded-md bg-white border border-slate-200
                           px-3 py-2 text-sm text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setShow(false)}
                className="px-4 py-2 text-sm rounded-md border border-slate-300
                     text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 text-sm rounded-md bg-indigo-600
                     text-white hover:bg-indigo-700 shadow"
              >
                {editId ? "Update Tax" : "Save Tax"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
