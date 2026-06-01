import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getGstList, deleteGst, toggleGstStatus } from "../../../api";
import { showError } from "../../../components/ui/alert/Alert";

export default function GstMasterList() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  /* -------- Fetch GST -------- */

  const fetchGst = async () => {
    try {
      setLoading(true);

      const res = await getGstList();

      setData(res?.data?.data || []);
    } catch (err) {
      console.error("GST fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGst();
  }, []);

  /* -------- Filter -------- */

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return data.filter(
      (g) =>
        (g.company_name || "").toLowerCase().includes(q) ||
        (g.gst_number || "").toLowerCase().includes(q) ||
        (g.city || "").toLowerCase().includes(q) ||
        (g.state || "").toLowerCase().includes(q),
    );
  }, [data, search]);

  /* -------- Pagination -------- */

  const totalPages = Math.ceil(filtered.length / perPage) || 1;

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;

    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [search, perPage]);

  /* -------- Delete -------- */

  const handleDelete = async (id) => {
    try {
      if (!window.confirm("Delete GST record?")) return;

      await deleteGst(id);

      fetchGst();
    } catch (err) {
      console.error("Delete failed", err);

      showError("Delete failed");
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleGstStatus(id);

      fetchGst();
    } catch (err) {
      console.error("Status change failed", err);

      showError("Status change failed");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* HEADER */}

      <div className="bg-white border rounded-lg">
        <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">GST Master</h2>

            <span className="px-3 py-1 text-xs rounded-full bg-red-500 text-white font-semibold">
              {filtered.length} Records
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}

            <div className="relative w-[260px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search GST..."
                className="h-[36px] w-full border rounded-md pl-10 pr-3 text-sm"
              />

              <Search
                size={16}
                className="absolute left-3 top-[10px] text-gray-500"
              />
            </div>

            {/* Create Button */}

            <button
              onClick={() => navigate("/gst-masterform")}
              className="h-[36px] px-4 bg-[#22A586] text-white rounded-md text-sm font-medium"
            >
              + New GST
            </button>
          </div>
        </div>

        {/* Pagination Info */}

        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-xs text-gray-600">
            Showing {(page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filtered.length)} of {filtered.length}
          </div>

          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="h-[32px] border rounded-md px-2 text-sm"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left w-[60px]">ID</th>
                <th className="px-3 py-3 text-left">Company</th>
                <th className="px-3 py-3 text-left">GST Number</th>
                <th className="px-3 py-3 text-left">Pincode</th>
                <th className="px-3 py-3 text-left">City</th>
                <th className="px-3 py-3 text-left">State</th>
                <th className="px-3 py-3 text-left">Contact</th>
                <th className="px-3 py-3 text-center w-[150px]">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-500">
                    No GST Records Found
                  </td>
                </tr>
              ) : (
                paginated.map((g,i) => (
                  <tr key={g.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3">{i+1}</td>

                    <td className="px-3 py-3 font-medium">{g.company_name}</td>

                    <td className="px-3 py-3 font-semibold text-blue-700">
                      {g.gst_number}
                    </td>

                    <td className="px-3 py-3">{g.pincode}</td>
                    <td className="px-3 py-3">{g.city}</td>

                    <td className="px-3 py-3">{g.state}</td>

                    <td className="px-3 py-3">{g.contact_no}</td>

                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex gap-2">
                        <button
                          className={`px-3 py-1 text-xs rounded-full font-semibold ${
                            g.delete_status === "show"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-300 text-red-600"
                          }`}
                          onClick={() => handleToggle(g.id)}
                        >
                          {g.delete_status === "show" ? "Active" : "Inactive"}
                        </button>

                        <button
                          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                          title="View"
                          onClick={() =>
                            navigate(`/gst-masterform/${g.id}?mode=view`)
                          }
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          className="p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                          title="Edit"
                          onClick={() => navigate(`/gst-masterform/${g.id}`)}
                        >
                          <Pencil size={16} />
                        </button>

                        {/* <button
                          className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                          title="Delete"
                          onClick={() => handleDelete(g.id)}
                        >
                          <Trash2 size={16} />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 p-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-sm font-semibold">
              {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
