import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import {
  getExpenseMasters,
  createExpenseMaster,
  updateExpenseMaster,
  deleteExpenseMaster,
  toggleExpenseMasterStatus,
} from "../../api";
import { showError } from "../../components/ui/alert/Alert";

export default function ExpenseMaster() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const [status, setStatus] = useState(1);
  const [types, setTypes] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const total = types.length;
  const totalPages = Math.ceil(total / perPage);

  const pagedTypes = types.slice((page - 1) * perPage, page * perPage);

  /* ================= FETCH ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getExpenseMasters();

      console.log("expense master raw response", res.data);

      // ✅ yahi sahi hai
      setList(res.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= OPEN MODAL ================= */
  const openAdd = () => {
    setEditId(null);
    setName("");
    setStatus(1);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setName(row.expense_master);
    setStatus(row.status);
    setShowModal(true);
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (!name.trim()) {
      return showError("Expense master name required");
    }

    try {
      if (editId) {
        await updateExpenseMaster(editId, {
          expense_master: name,
          status,
        });
      } else {
        await createExpenseMaster({
          expense_master: name,
        });
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || "Error saving data");
    }
  };


  /* ================= TOGGLE STATUS ================= */
const handleToggleStatus = async (id) => {
  // 🔹 instant UI update
  setList((prev) =>
    prev.map((item) =>
      item.id === id
        ? { ...item, status: item.status ? 0 : 1 }
        : item
    )
  );

  try {
    await toggleExpenseMasterStatus(id);
  } catch (err) {
    // 🔴 rollback if API fails
    setList((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status ? 0 : 1 }
          : item
      )
    );
    showError("Status update failed");
  }
};

  /* ================= UI ================= */
  return (
    <div className="p-6 min-h-screen">
      <div className="bg-white rounded-xl shadow capitalize">
        <div className="p-4 flex flex-wrap items-center gap-3 justify-between border-b">
          <h2 className="font-semibold">Expense Head Master</h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            <Plus size={16} /> Add Head
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow border overflow-hidden capitalize">
          <table className="w-full bg-white border rounded">
            <thead className="bg-[#5f5f5f] text-white text-sm">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border ">Expense Name</th>
                <th className="p-2 border">Status</th>
                {/* <th className="p-3 border ">Order</th> */}

                <th className="p-2 border">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : list.length ? (
                list.map((row, i) =>
                (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-2 border text-center">{i + 1}</td>
                    <td className="p-2 border">{row.expense_master}</td>
                    <td className="p-2 border text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${row.status
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                          }`}
                      >
                        {row.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {/* <th className="p-2 border text-center"></th> */}

                    <td className="p-3 border text-sm text-center">
                      <div className="flex justify-center gap-2">
                        {/* ✏ Edit */}
                        <button
                          onClick={() => openEdit(row)}
                          className={`p-2 rounded-md shadow-sm hover:scale-105 transition bg-blue-100 text-blue-600`}
                        >
                          <Pencil size={20} />
                        </button>

                        {/* 🔘 Toggle */}
                        <button
                          onClick={() => handleToggleStatus(row.id)}
                          className={`relative w-14 h-7 flex items-center rounded-full px-1 transition
                        ${row.status ? "bg-green-500" : "bg-red-500"}
                           `}
                        >
                          <span
                            className={`w-5 h-5 bg-white rounded-full shadow transform transition
                          ${row.status ? "translate-x-7" : "translate-x-0"}
                              `}
                          />
                          <span
                            className={`absolute text-[10px] font-semibold text-white
                         ${row.status ? "left-2" : "right-2"}
                               `}
                          >
                            {row.status ? "ON" : "OFF"}
                          </span>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>


          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
          <span className="text-sm text-gray-600">
            Showing {(page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, total)} of {total}
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
      </div>
      {/* MODAL */}
      {/* SIMPLE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-[380px] rounded-md border shadow-sm p-5">
            <h3 className="text-base font-semibold mb-4 text-gray-800">
              {editId ? "Edit Expense Master" : "Add Expense Master"}
            </h3>

            {/* INPUT */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">
                Expense Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter expense name"
                className="w-full border border-gray-300 px-3 py-2 rounded-sm text-sm
                     focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <input
                type="number"
                value={order}
                onChange={(e) =>
                  setOrder(e.target.value)}            
              placeholder="Display Order (1,2,3)"
              className="w-full border px-3 py-2 rounded"
            />
            </div>

            {/* STATUS (only edit) */}
            {editId && (
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(+e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-sm text-sm"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            )}

            {/* BUTTONS */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-sm text-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-gray-800 text-white rounded-sm"
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
