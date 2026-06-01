import React, { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Printer, Trash2, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBanks, deleteBank, updateBankStatus } from "../../api";
import { showError } from "../../components/ui/alert/Alert";

// const API_BASE = `${import.meta.env.VITE_SERVER_URL}/api`;

export default function BankTable() {
  const [banks, setBanks] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData?.id || null;
  // adjust if needed

  // ================= LOAD =================
  const loadBanks = async () => {
    if (!companyId) return;

    try {
      // setLoading(true);
      // const res = await axios.get(`${API_BASE}/bank?company_id=${companyId}`);
      const res = await getBanks(companyId);
      setBanks(res.data || []);
      setBanks(res.data || []);
    } catch (err) {
      console.error("Load banks error:", err);
      showError("Failed to load banks!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
  }, [companyId]);

  // ================= DELETE =================
  const handleDelete = async (row) => {
    if (!window.confirm("Delete this bank?")) return;

    try {
      // await axios.delete(`${API_BASE}/bank/${row.id}`);
      await deleteBank(row.id);
      setBanks((prev) => prev.filter((x) => x.id !== row.id));
    } catch (err) {
      console.error("Delete error:", err);
      showError("Delete failed!");
    }
  };

  // ================= PRINT =================
  const handlePrint = (row) => {
    const printWindow = window.open("", "_blank", "width=900,height=650");

    const qrText = row.upi_id
      ? `upi://pay?pa=${encodeURIComponent(row.upi_id)}&pn=${encodeURIComponent(
          row.holder_name || "Account Holder",
        )}&cu=INR`
      : "";

    const generatedQrImg = qrText
      ? `https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=${encodeURIComponent(
          qrText,
        )}`
      : "";

    const uploadedQrImg = row.qr_image
      ? `${import.meta.env.VITE_SERVER_URL}/uploads/qr/${row.qr_image}`
      : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Bank Print</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            .wrap { display: flex; gap: 20px; }
            .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; flex: 1; }
            h2 { margin: 0 0 10px; }
            .row { margin: 6px 0; font-size: 14px; }
            .label { font-weight: 700; color: #222; }
            .qrbox { width: 220px; height: 220px; border: 1px dashed #999; border-radius: 12px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
            img { width: 220px; height: 220px; object-fit: contain; }
            .small { font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <h2>Bank Master</h2>

          <div class="wrap">
            <div class="card">
              <div class="row"><span class="label">Bank Name:</span> ${row.bank_name}</div>
              <div class="row"><span class="label">Account No:</span> ${row.account_no}</div>
              <div class="row"><span class="label">Holder Name:</span> ${row.holder_name}</div>
              <div class="row"><span class="label">IFSC:</span> ${row.ifsc || "-"}</div>
              <div class="row">
  <span class="label">Opening Balance:</span> 
  ₹ ${Number(row.opening_balance || 0).toLocaleString()}
</div>

<div class="row">
  <span class="label">Balance Type:</span> 
  ${row.balance_type || "-"}
</div>

<div class="row">
  <span class="label">Opening Date:</span> 
  ${row.opening_date || "-"}
</div>
              <div class="row"><span class="label">Branch:</span> ${row.branch || "-"}</div>
              <div class="row"><span class="label">UPI ID:</span> ${row.upi_id || "-"}</div>
              <div class="row small">* Scan QR to pay using UPI apps</div>
            </div>

            <div class="card">
              <h3 style="margin-top:0;">QR</h3>

              <div class="qrbox">
                ${
                  uploadedQrImg
                    ? `<img src="${uploadedQrImg}" />`
                    : generatedQrImg
                      ? `<img src="${generatedQrImg}" />`
                      : `<div>No QR</div>`
                }
              </div>

              <div class="row small" style="margin-top:10px;">
                ${
                  uploadedQrImg
                    ? `Uploaded QR Image`
                    : generatedQrImg
                      ? `Generated UPI QR`
                      : `No UPI ID`
                }
              </div>
            </div>
          </div>

          <script>
            setTimeout(()=>window.print(), 500);
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // ================= FILTER =================
  const filteredBanks = useMemo(() => {
    if (!search.trim()) return banks;
    const s = search.toLowerCase();

    return banks.filter((x) => {
      return (
        (x.bank_name || "").toLowerCase().includes(s) ||
        (x.account_no || "").toLowerCase().includes(s) ||
        (x.holder_name || "").toLowerCase().includes(s) ||
        (x.ifsc || "").toLowerCase().includes(s) ||
        (x.upi_id || "").toLowerCase().includes(s)
      );
    });
  }, [banks, search]);

  const openView = (row) => {
    navigate("/bank-form", { state: { mode: "view", bank: row } });
  };

  const openEdit = (row) => {
    navigate("/bank-form", { state: { mode: "edit", bank: row } });
  };

  const toggleStatus = async (row) => {
    try {
      const newStatus = row.status === "active" ? "inactive" : "active";

      // await axios.put(`${API_BASE}/bank/status/${row.id}`, {
      //   status: newStatus,
      // });

      await updateBankStatus(row.id, { status: newStatus });

      // UI update instantly
      setBanks((prev) =>
        prev.map((b) => (b.id === row.id ? { ...b, status: newStatus } : b)),
      );
    } catch (err) {
      console.error("Status update error:", err);
      showError("Status update failed!");
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[#f6f7fb] min-h-screen">
      {/* Card Wrapper */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {/* Top Header Row */}
        <div className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">
              Bank Report
            </h1>

            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
              {filteredBanks.length} Records
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full lg:w-auto">
            {/* Search 1 */}
            <div className="flex items-center gap-2 border rounded-xl px-3 py-2 w-full md:w-[240px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bank Name..."
                className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400"
              />
              <Search className="text-gray-400" size={18} />
            </div>

            {/* Search 2 (dummy like image) */}
            <div className="flex items-center gap-2 border rounded-xl px-3 py-2 w-full md:w-[240px]">
              <input
                placeholder="Search Account No..."
                className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400"
              />
              <Search className="text-gray-400" size={18} />
            </div>

            {/* Create Button */}
            <button
              onClick={() => navigate("/bank-form", { state: { mode: "add" } })}
              className="bg-[#11a37f] hover:bg-[#0f8f6f] text-white font-semibold px-4 py-2 rounded-xl shadow-sm flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Plus size={18} />
              Create Bank
            </button>
          </div>
        </div>

        {/* Small Row like image */}
        <div className="px-4 md:px-5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-gray-500">
          <p>
            Showing 1 to {filteredBanks.length} of {filteredBanks.length}
          </p>

          <select className="border rounded-xl px-3 py-2 text-sm outline-none w-full md:w-[160px]">
            <option>10 per page</option>
            <option>25 per page</option>
            <option>50 per page</option>
            <option>100 per page</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#6b6f74] text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold border">Sr</th>
                <th className="text-left px-4 py-3 font-semibold border">
                  Bank Name
                </th>
                <th className="text-left px-4 py-3 font-semibold border">
                  Account No
                </th>
                <th className="text-left px-4 py-3 font-semibold border">
                  Holder Name
                </th>
                <th className="text-left px-4 py-3 font-semibold border">
                  IFSC
                </th>
                <th className="text-left px-4 py-3 font-semibold border">
                  Opening Balance
                </th>

                <th className="text-left px-4 py-3 font-semibold border">
                  Type
                </th>

                <th className="text-left px-4 py-3 font-semibold border">
                  Opening Date
                </th>
                <th className="text-left px-4 py-3 font-semibold border">
                  UPI
                </th>
                <th className="text-left px-4 py-3 font-semibold border">QR</th>
                <th className="text-center px-4 py-3 font-semibold border">
                  Status
                </th>
                <th className="text-center px-4 py-3 font-semibold border">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredBanks.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No banks found.
                  </td>
                </tr>
              ) : (
                filteredBanks.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-b-0 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 text-gray-700 border">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 font-semibold text-gray-900 border">
                      {row.bank_name}
                    </td>

                    <td className="px-4 py-3 text-gray-700 border">
                      {row.account_no}
                    </td>
                    <td className="px-4 py-3 text-gray-700 border">
                      {row.holder_name}
                    </td>

                    <td className="px-4 py-3 text-gray-700 border">
                      {row.ifsc || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 border">
                      ₹ {Number(row.opening_balance || 0).toLocaleString()}
                    </td>

                    <td
                      className={`px-4 py-3 border font-semibold ${
                        row.balance_type === "Dr"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {row.balance_type || "-"}
                    </td>

                    <td className="px-4 py-3 text-gray-700 border">
                      {row.opening_date
                        ? new Date(row.opening_date).toLocaleDateString("en-GB")
                        : "-"}
                    </td>

                    <td className="px-4 py-3 text-gray-700 border">
                      {row.upi_id || "-"}
                    </td>

                    <td className="px-4 py-3 border">
                      {row.qr_image ? (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          Uploaded
                        </span>
                      ) : row.upi_id ? (
                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                          Auto
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                          -
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center border">
                      <div
                        onClick={() => toggleStatus(row)}
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
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openView(row)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => handlePrint(row)}
                          className="p-2 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(row)}
                          className="p-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
