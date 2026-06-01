import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Power, Search } from "lucide-react";
import {
    getDesignations,
    createDesignation,
    updateDesignation,
    deleteDesignation,
    toggleDesignationStatus,
} from "../../api";
import { getDepartments } from "../../api";
import { useNavigate } from "react-router-dom";
import { showError } from "../../components/ui/alert/Alert";

export default function DesignationList() {
    const navigate = useNavigate();

    const [designations, setDesignations] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const [form, setForm] = useState({
        department_id: "",
        designation_name: "",
        display_order: "",
        status: 1,
    });

    /* ================= LOAD DATA ================= */
    useEffect(() => {
        loadDesignations();
        loadDepartments();
    }, []);

    const loadDesignations = async () => {
        try {
            const res = await getDesignations();
            setDesignations(res.data || []);
        } catch (err) {
            showError("Failed to load designations");
        }
    };

    const loadDepartments = async () => {
        try {
            const res = await getDepartments();
            setDepartments(res.data || res || []);
        } catch (err) {
            showError("Failed to load departments");
        }
    };

    /* ================= ADD ================= */
    const openAdd = () => {
        setForm({
            department_id: "",
            designation_name: "",
            display_order: "",
            status: 1,
        });
        setEditId(null);
        setOpen(true);
    };

    /* ================= EDIT ================= */
    const openEdit = (row) => {
        setForm({
            department_id: row.department_id,
            designation_name: row.designation_name,
            display_order: row.display_order,
            status: row.status,
        });
        setEditId(row.id);
        setOpen(true);
    };

    /* ================= SAVE ================= */
    const saveDesignation = async () => {
        if (!form.department_id) {
            showError("Department is required");
            return;
        }

        if (!form.designation_name.trim()) {
            showError("Designation Name is required");
            return;
        }

        try {
            if (editId) {
                await updateDesignation(editId, form);
                showError("Designation updated successfully");
            } else {
                await createDesignation(form);
                showError("Designation added successfully");
            }

            setOpen(false);
            loadDesignations();
        } catch (err) {
            showError(err.response?.data?.message || "Something went wrong");
        }
    };

    const toggleStatus = async (id) => {
        try {
            await toggleDesignationStatus(id);
            loadDesignations();
        } catch {
            showError("Status update failed");
        }
    };

    /* ================= DELETE ================= */
    const remove = async (id) => {
        if (!window.confirm("Delete this designation?")) return;

        try {
            await deleteDesignation(id);
            loadDesignations();
        } catch {
            showError("Delete failed");
        }
    };

    /* ================= SEARCH + PAGINATION ================= */
    const filtered = designations.filter((d) =>
        d.designation_name.toLowerCase().includes(search.toLowerCase()),
    );

    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return (
        <div className="p-6 min-h-screen">
            <div className="bg-white rounded-xl shadow">
            <div className="p-4 flex flex-wrap items-center gap-3 justify-between border-b">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Designation Report
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <input
                            type="text"
                            placeholder="Search Designation..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border border-gray-800 p-2 pl-9 rounded-md w-64 focus:outline-none focus:border-[#FF4200]"
                        />
                    </div>

                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
                    >
                        <Plus size={16} /> Add Type
                    </button>
                </div>
            </div>

            {/* ================= TABLE ================= */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[#5f5f5f] text-white text-sm">
                        <tr>
                            <th className="p-3 border">#</th>
                            <th className="p-3 border">Department Name</th>
                            <th className="p-3 border">Designation Name</th>
                            <th className="p-3 border">Display Order</th>
                            <th className="p-3 border">Status</th>
                            <th className="p-3 border">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {paginatedData.map((d, i) => (
                            <tr key={d.id} className="text-center hover:bg-gray-50">
                                <td className="p-2 border">{startIndex + i + 1}</td>
                                <td className="p-2 border">{d.department_name}</td>
                                <td className="p-2 border">{d.designation_name}</td>
                                <td className="p-2 border">{d.display_order}</td>
                                <td className="p-2 border">
                                    <span
                                        className={`px-2 py-1 text-xs rounded ${d.status
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                            }`}
                                    >
                                        {d.status ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="p-2 border flex gap-2 justify-center">
                                    <button
                                        onClick={() => openEdit(d)}
                                        className="p-2 bg-blue-100 text-blue-600 rounded"
                                    >
                                        <Pencil size={16} />
                                    </button>

                                    <button
                                        onClick={() => toggleStatus(d.id)}
                                        className={`relative w-14 h-7 flex items-center rounded-full px-1 transition
                                              ${d.status === 1 ? "bg-green-500" : "bg-red-500"}
                                             `}
                                    >
                                        <span
                                            className={`w-5 h-5 bg-white rounded-full shadow transform transition
                                                   ${d.status === 1 ? "translate-x-7" : "translate-x-0"}
                                                `}
                                        />
                                        <span
                                            className={`absolute text-[10px] font-semibold text-white
                                                     ${d.status === 1 ? "left-2" : "right-2"}
                                                  `}
                                        >
                                            {d.status ? "ON" : "OFF"}
                                        </span>
                                    </button>

                                    {/* <button
                    onClick={() => remove(d.id)}
                    className="p-2 bg-red-100 text-red-600 rounded"
                  >
                    <Trash2 size={16} />
                  </button> */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ================= PAGINATION ================= */}
                <div className="flex justify-between items-center px-4 py-3 text-sm text-gray-600 border-t">
                    <span>
                        Showing {total === 0 ? 0 : startIndex + 1} to{" "}
                        {Math.min(endIndex, total)} of {total}
                    </span>

                    <div className="flex items-center gap-2">
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setPage(1);
                            }}
                            className="border rounded px-2 py-1"
                        >
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                        </select>

                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="border px-2 py-1 rounded disabled:opacity-40"
                        >
                            ◀
                        </button>

                        <span>
                            {page} / {totalPages || 1}
                        </span>

                        <button
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage(page + 1)}
                            className="border px-2 py-1 rounded disabled:opacity-40"
                        >
                            ▶
                        </button>
                    </div>
                </div>
            </div>
</div>
            {/* ================= POPUP ================= */}
            {open && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white w-[400px] p-5 rounded-lg shadow">
                        <h3 className="font-semibold mb-4">
                            {editId ? "Edit Designation" : "Add Designation"}
                        </h3>

                        <div className="space-y-3">
                            <select
                                value={form.department_id}
                                onChange={(e) =>
                                    setForm({ ...form, department_id: e.target.value })
                                }
                                className="w-full border p-2 rounded bg-white"
                            >
                                <option value="">Select department *</option>
                                {departments
                                    .filter((d) => d.status === 1)
                                    .map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.department_name}
                                        </option>
                                    ))}

                            </select>

                            <input
                                type="text"
                                placeholder="Designation Name *"
                                value={form.designation_name}
                                onChange={(e) =>
                                    setForm({ ...form, designation_name: e.target.value })
                                }
                                className="w-full border p-2 rounded focus:outline-none focus:border-[#FF4200]"
                            />

                            <input
                                type="number"
                                placeholder="Display Order"
                                value={form.display_order}
                                onChange={(e) =>
                                    setForm({ ...form, display_order: e.target.value })
                                }
                                className="w-full border p-2 rounded focus:outline-none focus:border-[#FF4200]"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => setOpen(false)}
                                className="border px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveDesignation}
                                className="bg-blue-600 text-white px-4 py-2 rounded"
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
