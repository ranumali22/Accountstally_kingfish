import { useEffect, useMemo, useState } from "react";
import {
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  getActiveUnits,
} from "../../../api";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";

export default function ItemsMaster() {
  /* ================= STATE ================= */
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);

  const [openForm, setOpenForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [form, setForm] = useState({
    item_name: "",
    hsn_code: "",
    unit_id: "",
    display_index: 0,
  });

  /* ================= PAGINATION ================= */


  /* ================= LOAD DATA ================= */
  const loadItems = async () => {
    const res = await fetchItems();
    setItems(res.data.data || []);
  };

  const loadUnits = async () => {
    const res = await getActiveUnits();
    setUnits(res.data.data || []);
  };

  useEffect(() => {
    loadItems();
    loadUnits();
  }, []);

  /* ================= FORM ================= */
  const openAddForm = () => {
    setEditData(null);
    setForm({
      item_name: "",
      hsn_code: "",
      unit_id: "",
      display_index: 0,
    });
    setOpenForm(true);
  };

  const openEditForm = (item) => {
    setEditData(item);
    setForm({
      item_name: item.item_name,
      hsn_code: item.hsn_code || "",
      unit_id: item.unit_id,
      display_index: item.display_index,
    });
    setOpenForm(true);
  };

  const submitForm = async () => {
    if (!form.item_name || !form.unit_id) {
      showError("Item name & unit required");
      return;
    }

    const payload = {
      item_name: form.item_name.trim(),
      hsn_code: form.hsn_code?.trim() || null,
      unit_id: Number(form.unit_id),
      display_index: Number(form.display_index) || 0,
    };

    if (editData) {
      await updateItem(editData.id, payload);
    } else {
      await createItem(payload);
    }

    setOpenForm(false);
    loadItems();
  };

  /* ================= DELETE ================= */
  const confirmDelete = async () => {
    await deleteItem(deleteId);
    setDeleteId(null);
    loadItems();
  };

  /* ================= PAGINATION LOGIC ================= */
  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalRecords = items.length;
  const totalPages = Math.ceil(totalRecords / perPage);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [perPage]);


  /* ================= UI ================= */
  return (
    <div className="p-6 min-h-screen">
      {/* ================= HEADER ================= */}
      <div className="bg-white rounded-xl shadow capitalize">
        <div className="p-4 flex flex-wrap items-center gap-3 justify-between border-b">

          <div>
            <h1 className="text-xl font-semibold text-gray-800">Items Master</h1>
            <p className="text-sm text-gray-500">
              Total Records: <b>{totalRecords}</b>
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-green-600  text-white px-4 py-2 rounded"
          >
            <Plus size={18} /> Add Item
          </button>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow border overflow-hidden capitalize">
          <table className="w-full bg-white border rounded">
            <thead className="bg-[#5f5f5f] text-white text-sm">
              <tr>
                <th className="p-3 text-center border">#</th>
                <th className="p-3 text-center border">Item Name</th>
                <th className="p-3 text-center border">HSN</th>
                <th className="p-3 text-center border">Unit</th>
                <th className="p-3 text-center border">Index</th>
                <th className="p-3 text-center border ">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedData.map((it, i) => (
                <tr key={it.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-center border">{(page - 1) * perPage + i + 1}</td>
                  <td className="p-3 font-medium text-center border">{it.item_name}</td>
                  <td className="p-3 text-center border">{it.hsn_code || "-"}</td>
                  <td className="p-3 text-center border">{it.unit_name}</td>
                  <td className="p-3 text-center border">{it.display_index}</td>
                  <td className="p-3 text-center space-x-3">
                    <button
                      onClick={() => openEditForm(it)}
                      title="Edit"
                      className={`p-2 rounded-md shadow-sm hover:scale-105 transition bg-blue-100 text-blue-600`}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => setDeleteId(it.id)}
                      title="Delete"
                      className="
                     inline-flex items-center justify-center
                     w-9 h-9 rounded-md shadow-sm 
                     bg-red-100 text-red-700
                      hover:bg-red-200 hover:text-red-800
                       transition
                        "
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {!paginatedData.length && (
                <tr>
                  <td colSpan="6" className="p-5 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ================= PAGINATION ================= */}
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


      {/* ================= ADD / EDIT MODAL ================= */}
      {openForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[450px] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {editData ? "Edit Item" : "Add Item"}
            </h2>

            <input
              className="border rounded p-2 w-full"
              placeholder="Item Name"
              value={form.item_name}
              onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            />

            <input
              className="border rounded p-2 w-full"
              placeholder="HSN Code"
              value={form.hsn_code}
              onChange={(e) => setForm({ ...form, hsn_code: e.target.value })}
            />

            <select
              className="border rounded p-2 w-full"
              value={form.unit_id}
              onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
            >
              <option value="">Select Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>

            <input
              type="number"
              className="border rounded p-2 w-full"
              placeholder="Display Index"
              value={form.display_index}
              onChange={(e) =>
                setForm({ ...form, display_index: e.target.value })
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOpenForm(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitForm}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRM ================= */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg w-[320px] space-y-4">
            <h3 className="font-semibold text-red-600">Delete Item?</h3>
            <p className="text-sm text-gray-600">
              This item will be soft deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="border px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-600 text-white px-3 py-1 rounded "
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
