import { Eye, Pencil, Trash2, Search, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";
import { getTaxDuties, getTaxDutyById, deleteTaxDuty } from "../../../api";
import { showError } from "../../../components/ui/alert/Alert";

const formatDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt)) return "-";
  return dt.toLocaleDateString("en-GB");
};

export default function TdsList() {
  const navigate = useNavigate();
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  const [notes, setNotes] = useState([]);
  const [viewNote, setViewNote] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadData = async () => {
    console.log("API CALLED");
    try {
      setLoading(true);
      const res = await getTaxDuties(companyId);
      setNotes(res.data || []);
    } catch (err) {
      showError("Failed to load TDS entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this TDS entry ?")) return;
    await deleteTaxDuty(id);
    loadData();
  };

  const handleView = async (id) => {
    const res = await getTaxDutyById(id);
    setViewNote(res.data);
  };

  /* ================= FILTER ================= */

  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase();

    return notes.filter((n) => {
      const matchSearch =
        n.party_name?.toLowerCase().includes(q) ||
        n.group_name?.toLowerCase().includes(q) ||
        n.purchase_invoice_no?.toLowerCase().includes(q) ||
        n.expense_bill_no?.toLowerCase().includes(q);

      const matchType = typeFilter === "ALL" || n.bill_type === typeFilter;

      return matchSearch && matchType;
    });
  }, [notes, search, typeFilter]);

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(filteredNotes.length / rowsPerPage);
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;

  const paginated = filteredNotes.slice(start, end);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, rowsPerPage]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-5">
      {/* HEADER */}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">TDS Management</h1>
          <p className="text-sm text-gray-500">Track all TDS payments</p>
        </div>

        <button
          onClick={() => navigate("/TdsForm")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={16} />
          New Entry
        </button>
      </div>

      {/* FILTER BAR */}

      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-center">
        {/* SEARCH */}

        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party, bill..."
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64"
          />
        </div>

        {/* TYPE FILTER */}

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border px-3 py-2 rounded-lg text-sm"
        >
          <option value="ALL">All Types</option>
          <option value="PURCHASE">Purchase</option>
          <option value="EXPENSE">Expense</option>
        </select>

        {/* ROWS PER PAGE */}

        <select
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          className="border px-3 py-2 rounded-lg text-sm"
        >
          <option value={10}>10 rows</option>
          <option value={20}>20 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </select>
      </div>

      {/* TABLE */}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No TDS entries found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Sr No.</th>
                <th className="px-4 py-3 text-left">Party</th>
                <th className="px-4 py-3 text-left">Group</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Bill No</th>
                <th className="px-4 py-3 text-left">Payment type</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((note, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{start + i + 1}</td>

                  {/* <td className="px-4 py-3 font-medium">{note.party_name}</td> */}
                  <td className="px-4 py-3 font-medium">
                    {note.party_name}{" "}
                    {note.party_id && (
                      <span className="text-gray-500 text-xs">
                        [{note.party_id}]
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">{note.group_name}</td>

                  <td className="px-4 py-3">
                    {formatDate(note.transaction_date)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        note.bill_type === "PURCHASE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {note.bill_type}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {note.purchase_invoice_no || note.expense_bill_no || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {note.payment_type || "-"}

                    {note.payment_type === "BANK" && note.bank_name && (
                      <span className="text-gray-500 text-xs ml-1">
                        [{note.bank_name}]
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-green-600 font-semibold whitespace-nowrap">
                    ₹ {Number(note.tds).toFixed(2)}
                  </td>

                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button
                      onClick={() => handleView(note.id)}
                      className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={() => navigate(`/TdsForm?id=${note.id}`)}
                      className="p-2 bg-blue-100 rounded hover:bg-blue-200 text-blue-700"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 bg-red-100 rounded hover:bg-red-200 text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}

      <div className="flex justify-between items-center text-sm">
        <div>
          Showing {(page - 1) * rowsPerPage + 1} to{" "}
          {Math.min(page * rowsPerPage, filteredNotes.length)} of{" "}
          {filteredNotes.length}
        </div>

        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>

          <span className="px-3 py-1 border rounded bg-gray-100">
            {page} / {totalPages || 1}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      {/* VIEW MODAL */}
      {viewNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">TDS Details</h3>
              <button
                onClick={() => setViewNote(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Party</label>
                  <p className="font-medium text-gray-900">{viewNote.party_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Group</label>
                  <p className="font-medium text-gray-900">{viewNote.group_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Date</label>
                  <p className="font-medium text-gray-900">{formatDate(viewNote.transaction_date)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Type</label>
                  <p className="font-medium text-gray-900">{viewNote.bill_type}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Bill No</label>
                  <p className="font-medium text-gray-900">
                    {viewNote.purchase_invoice_no || viewNote.expense_bill_no || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">TDS Amount</label>
                  <p className="font-bold text-green-600 text-lg">₹ {Number(viewNote.tds).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Payment Type</label>
                  <p className="font-medium text-gray-900">{viewNote.payment_type}</p>
                </div>
                {viewNote.bank_name && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Bank</label>
                    <p className="font-medium text-gray-900">{viewNote.bank_name}</p>
                  </div>
                )}
                {viewNote.cheque_number && (
                   <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Cheque No</label>
                    <p className="font-medium text-gray-900">{viewNote.cheque_number}</p>
                  </div>
                )}
              </div>

              {viewNote.narration && (
                <div className="pt-2 border-t">
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Narration</label>
                  <p className="text-sm text-gray-700 italic">"{viewNote.narration}"</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setViewNote(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition shadow-sm font-medium"
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
