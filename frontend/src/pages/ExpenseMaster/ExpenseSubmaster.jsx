import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import {
  getExpenseMasters,
  getExpenseTypes,
  getExpenseTypesByMaster,
  createExpenseType,
  updateExpenseType,
  deleteExpenseType,
  toggleExpenseType,
} from "../../api";
import { showError } from "../../components/ui/alert/Alert";

export default function ExpenseType() {
  const [masters, setMasters] = useState([]);
  const [filterMasterId, setFilterMasterId] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formMasterId, setFormMasterId] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(1);

  /* ================= FETCH ================= */
  // const fetchMasters = async () => {
  //   const res = await getExpenseMasters();
  //   setMasters(res.data || []);
  // };

  const fetchMasters = async () => {
    const res = await getExpenseMasters();

    const activeMasters = (res.data || []).filter(
      (m) => Number(m.status) === 1,
    );

    setMasters(activeMasters);
  };

  const fetchTypes = async (masterId = "") => {
    setLoading(true);
    const res = masterId
      ? await getExpenseTypesByMaster(masterId)
      : await getExpenseTypes();
    setList(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMasters();
    fetchTypes();
  }, []);

  useEffect(() => {
    fetchTypes(filterMasterId);
  }, [filterMasterId]);

  /* ================= ACTIONS ================= */
  const openAdd = () => {
    setEditId(null);
    setFormMasterId("");
    setName("");
    setStatus(1);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setFormMasterId(String(row.expense_master_id));
    setName(row.expense_type);
    setStatus(row.status);
    setShowModal(true);
  };


const handleSave = async () => {
  if (!formMasterId || !name.trim()) {
    showError("Expense master & type required");
    return;
  }

  const payload = {
    expense_master_id: Number(formMasterId),
    expense_type: name.trim(),
    status,
  };

  try {
    if (editId) {
      await updateExpenseType(editId, payload);
    } else {
      await createExpenseType(payload);
    }

    setShowModal(false);
    fetchTypes(filterMasterId);
  } catch (err) {
    showError(err.response?.data?.message || "Something went wrong");
  }
};


const handleToggle = async (id) => {
  setList((prev) =>
    prev.map((item) =>
      item.id === id ? { ...item, status: item.status ? 0 : 1 } : item
    )
  );

  try {
    await toggleExpenseType(id);
  } catch (err) {
    // rollback if API fails
    setList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: item.status ? 0 : 1 } : item
      )
    );
  }
};


  /* ================= UI ================= */
  return (
    <div className="p-6 min-h-screen">
      <div className="bg-white rounded-xl shadow capitalize">
        {/* HEADER */}
        <div className="p-4 flex flex-wrap items-center gap-3 justify-between border-b">
          <h2 className="font-semibold">Expense Type  Master</h2>



          <button
            onClick={openAdd}

            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            <Plus size={16} /> Add Type
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">

          <table className="w-full ">
            <thead className="bg-[#5f5f5f] text-white text-sm">
              <tr>
                <th className="p-3 border">#</th>
                <th className="p-3 border">Expense Head </th>
                <th className="p-3 border">Expense Type </th>
                <th className="p-3 border text-center">Status</th>

                <th className="p-3 text-center border ">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : list.length ? (
                list.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 border text-sm text-center">{i + 1}</td>
                    <td className="p-3 border text-sm text-center">
                      {r.expense_master}
                    </td>
                    <td className="p-3 border text-sm text-center">
                      {r.expense_type}
                    </td>
                    <td className="px-4 py-3 text-center border">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${r.status
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                          }`}
                      >
                        {r.status ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="p-3 border text-sm text-center">
                      <div className="flex justify-center gap-2">
                        {/* ✏ Edit */}
                        <button
                          onClick={() => openEdit(r)}
                          className={`p-2 rounded-md shadow-sm hover:scale-105 transition bg-blue-100 text-blue-600`}
                        >
                          <Pencil size={20} />
                        </button>

                        {/* 🔘 Toggle */}
                        <button
                          onClick={() => handleToggle(r.id)}
                          className={`relative w-14 h-7 flex items-center rounded-full px-1 transition
                          ${r.status ? "bg-green-500" : "bg-red-500"}
                             `}
                        >
                          <span
                            className={`w-5 h-5 bg-white rounded-full shadow transform transition
                             ${r.status ? "translate-x-7" : "translate-x-0"}
                             `}
                          />
                          <span
                            className={`absolute text-[10px] font-semibold text-white
                         ${r.status ? "left-2" : "right-2"}
                              `}
                          >
                            {r.status ? "ON" : "OFF"}
                          </span>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-gray-500">
                    No expense types found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[420px] rounded-xl shadow-lg">
            <div className="px-5 py-4 border-b font-semibold">
              {editId ? "Edit Expense Type" : "Add Expense Type"}
            </div>

            <div className="p-5 space-y-4">
              <select
                value={formMasterId}
                onChange={(e) => setFormMasterId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Expense Master</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.expense_master}
                  </option>
                ))}
              </select>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Expense type name"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />

              {editId && (
                <select
                  value={status}
                  onChange={(e) => setStatus(+e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              )}
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
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
