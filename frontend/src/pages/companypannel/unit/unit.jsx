import { useEffect, useState, useMemo } from "react";
import { getAllUnits, createUnit, updateUnit, deleteUnit } from "../../../api";

/* ================= ICONS ================= */

import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";

/* ================= INITIAL STATE ================= */

const initialState = {
  unit_name: "",
  unit_code: "",
};

export default function UnitMaster() {
  const [units, setUnits] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(initialState);
  const [editId, setEditId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUnits = async () => {
    setLoading(true);
    const res = await getAllUnits();
    setUnits(res.data.data);
  };

  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    const esc = (e) =>
      e.key === "Escape" && (setShow(false), setViewData(null));
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const handleSubmit = async () => {
    if (!form.unit_name || !form.unit_code) return;

    const exists = units.find(
      (u) =>
        u.unit_code.toLowerCase() === form.unit_code.toLowerCase() &&
        u.id !== editId,
    );
    if (exists) return showError("Unit code already exists!");

    const payload = {
      ...form,
      display_name: `${form.unit_name} (${form.unit_code})`,
    };

    editId ? await updateUnit(editId, payload) : await createUnit(payload);

    setShow(false);
    setForm(initialState);
    setEditId(null);
    loadUnits();
  };

  const handleEdit = (u) => {
    setForm({ unit_name: u.unit_name, unit_code: u.unit_code });
    setEditId(u.id);
    setShow(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this unit?")) {
      await deleteUnit(id);
      loadUnits();
    }
  };
  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalRecords = units.length;
  const totalPages = Math.ceil(totalRecords / perPage);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * perPage;
    return units.slice(start, start + perPage);
  }, [units, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [perPage]);

  return (
    <div className="p-6 min-h-screen">
      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-xl shadow capitalize">

        <div className="p-4 flex flex-wrap items-center gap-3 justify-between border-b">
          <h1 className="text-xl font-semibold text-slate-900">Unit Master</h1>

          <button
            onClick={() => setShow(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded"

          >
            + Add Unit
          </button>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow border overflow-hidden capitalize">
          <table className="w-full bg-white border rounded">
            <thead className="bg-[#5f5f5f] text-white text-sm">
              <tr>
                <th className="px-4 py-3 border">#</th>
                <th className="px-4 py-3 border">Unit</th>
                <th className="px-4 py-3 border ">Code</th>
                <th className="px-4 py-3 border">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.map((u, i) => (

                <tr
                  key={u.id}
                  className="border-t hover:bg-indigo-50/40 transition"
                >
                  <td className="p-2 border text-center">{i + 1}</td>

                  <td className="px-4 py-3 border text-center">
                    {u.display_name}
                  </td>

                  <td className="px-4 py-3 border text-center">{u.unit_code}</td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3 border text-center">
                    <div className="inline-flex items-center gap-2">
                      {/* VIEW */}
                      <button
                        title="View"
                        onClick={() => setViewData(u)}
                        className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        title="Edit"
                        onClick={() => handleEdit(u)}
                        className={`p-2 rounded-md shadow-sm hover:scale-105 transition bg-blue-100 text-blue-600`}
                      >
                        <Pencil size={20} />
                      </button>

                      <button
                        title="Delete"
                        onClick={() => handleDelete(u.id)}
                        className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200"

                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {units.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-slate-500">
                    No units found
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

      {/* ================= MODAL ================= */}
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border">
            {/* HEADER */}
            <div className="px-6 py-4 border-b bg-slate-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editId ? "Edit Unit" : "Add Unit"}
                  </h2>

                </div>

                <button
                  onClick={() => setShow(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full
                             text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit Name
                </label>
                <input
                  value={form.unit_name}
                  onChange={(e) =>
                    setForm({ ...form, unit_name: e.target.value })
                  }
                  placeholder="BAGS"
                  className="w-full rounded-lg border border-slate-300
                             px-4 py-2.5 text-sm
                             placeholder:text-slate-400
                             focus:outline-none
                             focus:ring-2 focus:ring-indigo-500/30
                             focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit Code
                </label>
                <input
                  value={form.unit_code}
                  // onChange={(e) =>
                  //   setForm({ ...form, unit_code: e.target.value })
                  // }

                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit_code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="BAG"
                  className="w-full rounded-lg border border-slate-300
                             px-4 py-2.5 text-sm
                             placeholder:text-slate-400
                             focus:outline-none
                             focus:ring-2 focus:ring-indigo-500/30
                             focus:border-indigo-500"
                />
              </div>

              {/* PREVIEW */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
                <p className="text-xs text-indigo-600 font-medium mb-1">
                  Preview
                </p>
                <p className="text-sm font-semibold text-indigo-800">
                  {form.unit_name || "UNIT"} ({form.unit_code || "CODE"})
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setShow(false)}
                className="px-5 py-2.5 text-sm rounded-lg
                           border border-slate-300
                           text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 text-sm font-medium rounded-lg
                           bg-green-600 text-white
                           shadow-sm focus:ring-2 focus:ring-indigo-500/40"
              >
                {editId ? "Update Unit" : "Save Unit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border">
            {/* HEADER */}
            <div className="px-6 py-4 border-b bg-slate-50 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Unit Details
                </h2>
                <p className="text-xs text-slate-500">View unit information</p>
              </div>
              <button
                onClick={() => setViewData(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full
                     text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Unit Name</p>
                <p className="font-semibold text-slate-800">
                  {viewData.unit_name}
                </p>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Unit Code</p>
                <p className="font-semibold text-slate-800">
                  {viewData.unit_code}
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-xs text-indigo-600 mb-1">Display Name</p>
                <p className="font-semibold text-indigo-800">
                  {viewData.display_name}
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setViewData(null)}
                className="px-5 py-2.5 text-sm rounded-lg
                     border border-slate-300
                     text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>

              <button
                onClick={() => {
                  setViewData(null);
                  handleEdit(viewData);
                }}
                className="px-6 py-2.5 text-sm font-medium rounded-lg
                     bg-indigo-600 text-white
                     hover:bg-indigo-700 shadow-sm"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
