import { useEffect, useState, useMemo } from "react";
import { Eye, Pencil, Printer, Trash2, Search, Plus } from "lucide-react";
import PartyForm from "./PartyForm";

import { useContext } from "react";
import { LoaderContext } from "../../context/LoaderContext";

function ViewCard({ title, children }) {
  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div className="px-4 py-2 border-b bg-gray-50 font-medium text-gray-700 text-sm">
        {title}
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function ViewItem({ label, value, badge = false }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      {badge ? (
        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
          {value}
        </span>
      ) : (
        <span className="font-medium text-gray-800 text-right break-all">
          {value}
        </span>
      )}
    </div>
  );
}

export default function KycCompanyForm({ onClose, onSuccess }) {
  const [partyList, setPartyList] = useState([]);
  const { loading, setLoading } = useContext(LoaderContext);
  const [editData, setEditData] = useState(null);
  const [viewParty, setViewParty] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const companyData = JSON.parse(localStorage.getItem("company_data"));
  const COMPANY_ID = companyData?.id;
  const API_BASE = `${import.meta.env.VITE_SERVER_URL}/api` + "/party";

  if (!COMPANY_ID) {
    return (
      <div className="p-4 text-red-500">
        Company not found. Please login again.
      </div>
    );
  }

  const fetchParties = async () => {
    try {
      // ❌ global loader hata diya

      // ✅ CACHE (instant UI)
      const cached = localStorage.getItem("party_cache");
      if (cached) {
        setPartyList(JSON.parse(cached));
      }

      // ✅ background fetch (non-blocking)
      fetch(`${API_BASE}?company_id=${COMPANY_ID}`)
        .then((res) => res.json())
        .then((data) => {
          setPartyList(data);

          // ✅ cache update
          localStorage.setItem("party_cache", JSON.stringify(data));
        })
        .catch((err) => console.error(err));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleEdit = (row) => {
    setEditData(row);

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStatusToggle = async (row) => {
    try {
      const newStatus = row.status === "active" ? "inactive" : "active";

      await fetch(`${API_BASE}/status/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      // ✅ UI update instantly
      setPartyList((prev) =>
        prev.map((p) => (p.id === row.id ? { ...p, status: newStatus } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = (row) => {
    const printWindow = window.open("", "_blank", "width=900,height=650");

    printWindow.document.write(`
    <html>
      <head>
        <title>Party Print</title>
        <style>
          body { font-family: Arial; padding: 20px; color: #111; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #ddd;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h2 { margin: 0; font-size: 20px; }
          .header small { color: #666; }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .box {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
          }

          .box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 6px;
          }

          table { width: 100%; border-collapse: collapse; }
          td {
            padding: 6px 4px;
            vertical-align: top;
            font-size: 13px;
          }
          td.label {
            width: 45%;
            font-weight: bold;
            color: #444;
          }
          td.value {
            width: 55%;
            color: #111;
          }

          .footer {
            margin-top: 18px;
            font-size: 12px;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            text-align: center;
          }

          @media print {
            body { padding: 0; }
            .box { break-inside: avoid; }
          }
        </style>
      </head>
      <body>

        <div class="header">
          <div>
            <h2>Party Details</h2>
            <small>Print Preview</small>
          </div>
          <div>
            <small><b>ID:</b> ${row.id || "-"}</small><br/>
            <small><b>Status:</b> ${row.status || "-"}</small>
          </div>
        </div>

        <div class="grid">

          <!-- LEFT SIDE -->
          <div class="box">
            <h3>Basic Information</h3>
            <table>
              <tr><td class="label">User Type</td><td class="value">${row.user_type || "-"}</td></tr>
              <tr><td class="label">Company Name</td><td class="value">${row.company_name || "-"}</td></tr>
              <tr><td class="label">Branch Name</td><td class="value">${row.branch_name || "-"}</td></tr>
              <tr><td class="label">Branch Type</td><td class="value">${row.branch_type || "-"}</td></tr>
              <tr><td class="label">Branch ID</td><td class="value">${row.branch_id || "-"}</td></tr>
            </table>
          </div>

          <!-- RIGHT SIDE -->
          <div class="box">
            <h3>GST & Tax Details</h3>
            <table>
              <tr><td class="label">GST Type</td><td class="value">${row.gst_type || "-"}</td></tr>
              <tr><td class="label">GST Number</td><td class="value">${row.gst_number || "-"}</td></tr>
              <tr><td class="label">Service Tax No</td><td class="value">${row.service_tax_no || "-"}</td></tr>
              <tr><td class="label">TDS Applicable</td><td class="value">${row.tds_applicable || "no"}</td></tr>
            </table>
          </div>

          <!-- LEFT SIDE -->
          <div class="box">
            <h3>Contact Details</h3>
            <table>
              <tr><td class="label">Contact Person</td><td class="value">${row.contact_person || "-"}</td></tr>
              <tr><td class="label">Phone Number</td><td class="value">${row.phone_number || "-"}</td></tr>
              <tr><td class="label">Mobile Number</td><td class="value">${row.mobile_number || "-"}</td></tr>
              <tr><td class="label">Email</td><td class="value">${row.email || "-"}</td></tr>
            </table>
          </div>

          <!-- RIGHT SIDE -->
          <div class="box">
            <h3>Address Details</h3>
            <table>
              <tr><td class="label">Address</td><td class="value">${row.address || "-"}</td></tr>
              <tr><td class="label">City</td><td class="value">${row.city || "-"}</td></tr>
              <tr><td class="label">State</td><td class="value">${row.state || "-"}</td></tr>
          <tr><td class="label">State Code</td><td class="value">${row.state_code || "-"}</td></tr>
              <tr><td class="label">Pincode</td><td class="value">${row.pincode || "-"}</td></tr>
            </table>
          </div>

          <!-- LEFT SIDE -->
          <div class="box">
            <h3>Identity Details</h3>
            <table>
              <tr><td class="label">Aadhaar Number</td><td class="value">${row.aadhaar_number || "-"}</td></tr>
              <tr><td class="label">PAN Number</td><td class="value">${row.pan_number || "-"}</td></tr>
            </table>
          </div>

         
       

        </div>

        <div class="footer">
          This is a computer generated print. No signature required.
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>

      </body>
    </html>
  `);

    printWindow.document.close();
  };
  const handleView = (row) => {
    setViewParty(row);
  };

  const filteredPartyList = useMemo(() => {
    const s = search.toLowerCase().trim();

    return partyList.filter((p) => {
      const matchesSearch =
        !s ||
        String(p.id).includes(s) ||
        String(p.company_name || "")
          .toLowerCase()
          .includes(s) ||
        String(p.branch_name || "")
          .toLowerCase()
          .includes(s) ||
        String(p.user_type || "")
          .toLowerCase()
          .includes(s) ||
        String(p.gst_number || "")
          .toLowerCase()
          .includes(s) ||
        String(p.phone_number || "").includes(s) ||
        String(p.city || "")
          .toLowerCase()
          .includes(s);

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesStatus && p.user_type === "user";
    });
  }, [partyList, search, statusFilter]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(filteredPartyList.length / pageSize);

  const paginatedData = filteredPartyList.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <div className="py-2">
      <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl border">
        {/* HEADER */}
        <div className="px-6 py-2  flex items-center justify-between">
          {showForm && (
            <button
              type="button"
              onClick={() => {
                setEditData(null);
                setShowForm(false);
              }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#FF4200]"
            >
              ← Back
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
            >
              Close
            </button>
          )}

          <h2 className="text-lg font-semibold">Party Management</h2>

          <span className="text-xs px-3 py-1 rounded-full bg-orange-100 text-[#FF4200]">
            Secure Verification
          </span>
        </div>

        {/* FORM */}
        {showForm && (
          <PartyForm
            editData={editData}
            COMPANY_ID={COMPANY_ID}
            API_BASE={API_BASE}
            onSuccess={() => {
              setShowForm(false);
              setEditData(null);
              fetchParties();
              onSuccess && onSuccess();
            }}
          />
        )}

        {/* PARTY LIST */}
        {!showForm && (
          <div className="md:col-span-3">
            <div className="bg-white border rounded-xl  p-4 ">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <p className="text-xs text-gray-500">
                    Total Records: {filteredPartyList.length}
                  </p>
                </div>

                {/* Search */}

                <div className="flex flex-col sm:flex-row sm:ml-auto gap-3 w-full sm:w-auto">
                  {/* SEARCH */}
                  <div className="flex items-center gap-2 border rounded-xl px-3 h-10 bg-white w-full sm:w-[260px]">
                    <Search size={16} className="text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search Party / GST / Mobile..."
                      className="w-full outline-none text-sm"
                    />
                  </div>

                  {/* STATUS FILTER */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-xl px-3 h-10 text-sm bg-white shadow-sm"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  {/* ADD BUTTON */}
                  <button
                    onClick={() => {
                      setEditData(null);
                      setShowForm(true);
                    }}
                    className="px-4 py-2 bg-[#FF4200] text-white rounded-lg text-sm"
                  >
                    + Add Party
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ TABLE UI (Your same design) */}
            <div className="overflow-auto border rounded-2xl shadow-sm bg-white capitalize">
              <table className="w-full text-sm border-collapse">
                {/* ✅ DARK HEADER */}
                <thead className="bg-[#666] text-white">
                  <tr>
                    <th className="p-3 text-center w-12 border">Sr</th>
                    <th className="p-3 text-left border">Party ID</th>
                    <th className="p-3 text-left border">Name</th>
                    <th className="p-3 text-center border">Type</th>
                    <th className="p-3 text-left border">GST</th>
                    <th className="p-3 text-left border">PAN </th>
                    <th className="p-3 text-left border">Mobile</th>
                    <th className="p-3 text-left border">City</th>
                    <th className="p-3 text-center border">Status</th>
                    <th className="p-3 text-center w-[160px]">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.map((row, index) => (
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-center border">{(page - 1) * pageSize + index + 1}</td>

                      <td className="p-3 text-xs text-gray-600 border">
                        {row.id}
                      </td>

                      <td className="p-3 font-medium border">
                        {row.company_name || row.branch_name} [
                        {row.ledger_number}]
                      </td>

                      <td className="p-3 text-center capitalize border">
                        {row.user_type}
                      </td>
                      <td className="p-3 border">{row.gst_number || "-"}</td>
                      <td className="p-3 border">{row.pan_number || "-"}</td>
                      <td className="p-3 border">{row.mobile_number || "-"}</td>

                      <td className="p-3 border">{row.city || "-"}</td>

                      <td className="p-3 text-center border">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            row.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      {/* ✅ ACTION BUTTONS */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(row)}
                            className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => handleEdit(row)}
                            className="p-2 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handlePrint(row)}
                            className="p-2 rounded-md bg-green-100 text-green-600 hover:bg-green-200"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>

                          <div
                            onClick={() => handleStatusToggle(row)}
                            className={`relative w-12 h-6 flex items-center rounded-full cursor-pointer transition-all duration-300 ${
                              row.status === "active"
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ${
                                row.status === "active"
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* ✅ EMPTY DATA MESSAGE */}
                  {!filteredPartyList.length && (
                    <tr>
                      <td
                        colSpan="9"
                        className="py-16 text-center text-gray-400"
                      >
                        No parties found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4">
              {/* LEFT INFO */}

              <div className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, filteredPartyList.length)} of{" "}
                {filteredPartyList.length}
              </div>

              {/* RIGHT BUTTONS */}

              <div className="flex items-center gap-2">
                {/* PREV */}
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  Prev
                </button>
                {/* PAGE NUMBERS */}
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      page === i + 1
                        ? "bg-blue-600 text-white"
                        : "border hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                {/* NEXT */}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 border rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewParty && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-xl shadow-xl overflow-y-auto">
            {/* HEADER */}
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Party Details
                </h2>
                <p className="text-xs text-gray-500">
                  Complete party information
                </p>
              </div>
              <button
                onClick={() => setViewParty(null)}
                className="px-4 py-1.5 text-sm rounded-md border text-gray-600 hover:bg-gray-100"
              >
                ✕ Close
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
              {/* BASIC */}
              <ViewCard title="Basic Information">
                <ViewItem label="Party ID" value={viewParty.id} />
                <ViewItem label="Status" value={viewParty.status} badge />
                <ViewItem label="User Type" value={viewParty.user_type} />
                <ViewItem
                  label="Name"
                  value={viewParty.company_name || viewParty.branch_name}
                />
              </ViewCard>

              {/* GST */}
              <ViewCard title="GST & Tax Details">
                <ViewItem label="GST Type" value={viewParty.gst_type} />
                <ViewItem
                  label="GST Number"
                  value={viewParty.gst_number || "-"}
                />
                <ViewItem
                  label="Service Tax"
                  value={viewParty.service_tax_no || "-"}
                />
                <ViewItem
                  label="TDS Applicable"
                  value={viewParty.tds_applicable || "no"}
                />
              </ViewCard>

              {/* CONTACT */}
              <ViewCard title="Contact Details">
                <ViewItem
                  label="Contact Person"
                  value={viewParty.contact_person || "-"}
                />
                <ViewItem label="Phone" value={viewParty.phone_number || "-"} />
                <ViewItem
                  label="Mobile"
                  value={viewParty.mobile_number || "-"}
                />
                <ViewItem label="Email" value={viewParty.email || "-"} />
              </ViewCard>

              {/* ADDRESS */}
              <ViewCard title="Address Details">
                <ViewItem label="Address" value={viewParty.address || "-"} />
                <ViewItem label="City" value={viewParty.city || "-"} />
                <ViewItem label="State" value={viewParty.state || "-"} />
             <ViewItem label="State Code" value={viewParty.state_code || "-"} />
                <ViewItem label="Pincode" value={viewParty.pincode || "-"} />
              </ViewCard>

              {/* IDENTITY */}
              <ViewCard title="Identity Details">
                <ViewItem
                  label="Aadhaar"
                  value={viewParty.aadhaar_number || "-"}
                />
                <ViewItem label="PAN" value={viewParty.pan_number || "-"} />
              </ViewCard>

          
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => handlePrint(viewParty)}
                className="px-5 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
              >
                Print
              </button>
              <button
                onClick={() => setViewParty(null)}
                className="px-5 py-2 rounded-md border text-gray-600 text-sm hover:bg-gray-100"
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
