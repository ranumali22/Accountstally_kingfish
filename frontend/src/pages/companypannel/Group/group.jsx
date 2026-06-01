import { useEffect, useState } from "react";
import { createGroup, getGroups, updateGroup, deleteGroup } from "../../../api";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import { showError } from "../../../components/ui/alert/Alert";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [viewGroup, setViewGroup] = useState(null);

  const [form, setForm] = useState({
    name: "",
    parent_id: "",
  });

  /* ================= LOAD GROUPS ================= */
  const loadGroups = async () => {
    try {
      const res = await getGroups();
      setGroups(res.data || []);
    } catch (err) {
      console.error("Failed to load groups", err);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  /* ================= SUBMIT (CREATE / UPDATE) ================= */
  const submitGroup = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id || null, // ✅ ROOT allowed
      };

      if (editingId) {
        await updateGroup(editingId, payload);
      } else {
        await createGroup(payload);
      }

      resetForm();
      loadGroups();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save group");
    }
  };

  const resetForm = () => {
    setForm({ name: "", parent_id: "" });
    setEditingId(null);
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? Group will be deleted.")) return;

    try {
      await deleteGroup(id);
      loadGroups();
    } catch (err) {
      showError(
        err?.response?.data?.message ||
          "Group cannot be deleted (child group / ledger exists)"
      );
    }
  };
const handleView = (g) => {
    setViewGroup(g);
  };

  // ================= PRINT =================
  const handlePrint = (g) => {
    const parentName = g.parent_id
      ? groups.find((p) => p.id === g.parent_id)?.name
      : "Primary";

    const html = `
      <div style="font-family: Arial; padding:20px;">
        <h2>Group Details</h2>
        <p><b>Name:</b> ${g.name}</p>
        <p><b>Nature:</b> ${g.nature}</p>
        <p><b>Parent:</b> ${parentName}</p>
      </div>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };
  /* ================= UI ================= */
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Group Master (Accounting)</h2>

      {/* ================= FORM ================= */}
  <form
        onSubmit={submitGroup}
         className="bg-gray-50 border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* GROUP NAME */}
        <div className="relative">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="peer w-full rounded-xl border border-gray-800
              px-3 pt-4 pb-2 text-sm bg-white
              focus:outline-none focus:border-[#FF4200]"
          />
          <label className="absolute left-3 -top-2 bg-white px-1 text-xs font-medium text-gray-700 peer-focus:text-[#FF4200]">
            Group Name
          </label>
        </div>

        {/* PARENT GROUP */}
        <div className="relative">
          <select
            value={form.parent_id || ""}
            onChange={(e) =>
              setForm({
                ...form,
                parent_id: e.target.value || "",
              })
            }
            className="peer w-full h-[46px] rounded-xl border border-gray-800
              px-3 text-sm bg-white focus:outline-none focus:border-[#FF4200]"
          >
            <option value="">Primary (Root)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <label className="absolute left-3 -top-2 bg-white px-1 text-xs font-medium text-gray-700 peer-focus:text-[#FF4200]">
            Parent Group
          </label>
        </div>

        {/* BUTTON */}
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="w-full bg-[#FF4200] text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600"
          >
            {editingId ? "Update Group" : "Save Group"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="w-full bg-gray-200 text-gray-800 rounded-xl py-3 text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          )}
        </div>


      </form>

      {/* ================= LIST ================= */}
      <div className="overflow-x-auto bg-white border rounded-lg">
        {groups.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No groups found. Create your first group.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-3">Name</th>
              <th className="border px-4 py-3 ">
                Nature
              </th>
              <th className="border px-4 py-3 ">
                Parent
              </th>
              <th className="border px-4 py-3  w-[200px]">
                Action
              </th>
            </tr>
          </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-medium">{g.name}</td>
                  <td className="px-4 py-2 border">{g.nature}</td>
                  <td className="px-4 py-2 border">
                    {g.parent_id
                      ? groups.find((p) => p.id === g.parent_id)?.name
                      : "Primary"}
                  </td>
                  <td className="border px-2 py-2 text-center">
                    <div className="inline-flex items-center justify-center gap-2">
                      {/* VIEW */}
                      <button
                        onClick={() => handleView(g)}
                        className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>

                      {/* EDIT */}
                      <button
                        onClick={() => {
                          setEditingId(g.id);
                          setForm({
                            name: g.name,
                            parent_id: g.parent_id || "",
                          });
                        }}
                        className="p-2 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* PRINT */}
                      <button
                        onClick={() => handlePrint(g)}
                        className="p-2 rounded-md bg-green-100 text-green-600 hover:bg-green-200"
                        title="Print"
                      >
                        <Printer size={16} />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="p-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
            {viewGroup && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Group Details</h3>
              <button
                onClick={() => setViewGroup(null)}
                className="text-gray-500 hover:text-gray-900 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-sm space-y-2">
              <p>
                <b>Name:</b> {viewGroup.name}
              </p>
              <p>
                <b>Nature:</b> {viewGroup.nature}
              </p>
              <p>
                <b>Parent:</b>{" "}
                {viewGroup.parent_id
                  ? groups.find((p) => p.id === viewGroup.parent_id)?.name
                  : "Primary"}
              </p>
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setViewGroup(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
