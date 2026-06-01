import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Search, ArrowLeft } from "lucide-react";
import {
  searchParty,
  createOpeningBalance,
  getOpeningBalances,
  getOpeningBalanceById,
  updateOpeningBalance,
  deleteOpeningBalance,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";

export default function OpeningBalancePage() {
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [partySearch, setPartySearch] = useState("");
  const [partyList, setPartyList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(null);

  const [form, setForm] = useState({
    party: "",
    gst: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    contact: "",
    amount: "",
    type: "Dr",
    date: "",
  });

  // =============================
  // 🔍 PARTY SEARCH
  // =============================
  useEffect(() => {
    if (!partySearch.trim() || !companyId) {
      setPartyList([]);
      return;
    }

    searchParty({ q: partySearch, company_id: companyId })
      .then((res) => setPartyList(res.data || []))
      .catch(console.error);
  }, [partySearch, companyId]);

  const selectParty = (p) => {
    setSelectedPartyId(p.id);
    setPartySearch(`${p.company_name} [${p.id}]`);

    setForm({
      ...form,
      party: p.company_name,
      gst: p.gst_number || "",
      city: p.city || "",
      state: p.state || "",
      pincode: p.pincode || "",
      address: p.address || "",
      contact: p.mobile_number || "",
    });

    setShowDropdown(false);
  };

  useEffect(() => {
    if (!companyId) return;

    fetchOpeningBalances();
  }, [companyId]);

  const fetchOpeningBalances = async () => {
    try {
      const res = await getOpeningBalances(companyId);
      setData(res.data || []);
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  // =============================
  // 💾 SAVE
  // =============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPartyId) {
      showError("Please select party");
      return;
    }

    const payload = {
      company_id: companyId,
      party_id: selectedPartyId,
      amount: Number(form.amount),
      balance_type: form.type,
      effective_date: form.date,
    };

    try {
      if (editItem) {
        await updateOpeningBalance(editItem.id, payload);
        showSuccess("Opening Balance Updated ✅");
      } else {
        await createOpeningBalance(payload);
        showSuccess("Opening Balance Created ✅");
      }

      await fetchOpeningBalances(); // refresh list
      resetForm();
    } catch (err) {
      console.error(err);
      showError("Save failed");
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setSelectedPartyId(item.party_id);

    setForm({
      party: item.party_name,
      gst: item.gst_number || "",
      city: item.city || "",
      state: item.state || "",
      pincode: item.pincode || "",
      address: item.address || "",
      contact: item.mobile_number || "",
      amount: item.amount,
      type: item.balance_type,
      date: item.effective_date,
    });

    setPartySearch(item.party_name);
    setShowForm(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;

    try {
      await deleteOpeningBalance(id, companyId);
      await fetchOpeningBalances();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const resetForm = () => {
    setForm({
      party: "",
      gst: "",
      city: "",
      state: "",
      pincode: "",
      address: "",
      contact: "",
      amount: "",
      type: "Dr",
      date: "",
    });
    setPartySearch("");
    setSelectedPartyId(null);
    setEditItem(null);
    setShowForm(false);
  };
  const totalDr = data
    .filter((i) => i.balance_type === "Dr")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalCr = data
    .filter((i) => i.balance_type === "Cr")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const filteredData = data.filter((item) => {
    const matchesSearch = (item.party_name || "")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesType =
      filterType === "All" || item.balance_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Opening Balance
            </h1>
            <p className="text-sm text-gray-500">
              Manage initial ledger balances
            </p>
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition"
            >
              <Plus size={16} /> Add Balance
            </button>
          )}
        </div>

        {!showForm ? (
          <>
            {/* SUMMARY */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <SummaryCard
                title="Total Debit"
                amount={totalDr}
                color="text-green-600"
              />
              <SummaryCard
                title="Total Credit"
                amount={totalCr}
                color="text-red-600"
              />
            </div>

            {/* SEARCH */}
            <div className="bg-white p-5 rounded-xl shadow-sm border mb-6 flex gap-4">
              <div className="relative w-1/3">
                <Search
                  className="absolute left-3 top-3 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search Party..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All</option>
                <option value="Dr">Debit</option>
                <option value="Cr">Credit</option>
              </select>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-gray-600">
                  <tr>
                    <th className="p-4 text-left">Party</th>
                    <th className="p-4 text-left">City</th>
                    <th className="p-4 text-left">Contact</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-center">Type</th>
                    <th className="p-4 text-center">Date</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t hover:bg-slate-50 transition"
                    >
                      <td className="p-4 font-medium">{item.party_name}</td>
                      <td className="p-4">{item.city}</td>
                      <td className="p-4">{item.mobile_number}</td>
                      <td className="p-4 text-right font-semibold">
                        ₹ {Number(item.amount).toLocaleString()}
                      </td>
                      <td
                        className={`p-4 text-center font-medium ${
                          item.balance_type === "Dr"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {item.balance_type}
                      </td>

                      <td className="p-4 text-center">{item.effective_date}</td>
                      <td className="p-4 text-center flex justify-center gap-4">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* FORM */
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={resetForm}>
                <ArrowLeft />
              </button>
              <h2 className="text-lg font-semibold">
                {editItem ? "Edit" : "Add"} Opening Balance
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6">
              {/* PARTY SEARCH */}
              <div className="relative col-span-3">
                <input
                  value={partySearch}
                  onChange={(e) => {
                    setPartySearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  className="w-full h-11 border rounded px-3"
                  placeholder="Search Party..."
                  required
                />

                {showDropdown && partyList.length > 0 && (
                  <div className="absolute z-50 bg-white border w-full rounded shadow max-h-52 overflow-auto">
                    {partyList.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectParty(p)}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-b"
                      >
                        <div className="font-semibold text-sm">
                          {p.company_name} [{p.id}]
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.mobile_number} | {p.state} | {p.city}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Input label="GST" value={form.gst} readOnly />
              <Input label="City" value={form.city} readOnly />
              <Input label="State" value={form.state} readOnly />
              <Input label="Pincode" value={form.pincode} readOnly />
              <Input label="Address" value={form.address} readOnly />
              <Input label="Contact" value={form.contact} readOnly />

              <Input
                label="Opening Amount"
                type="number"
                value={form.amount}
                onChange={(v) => setForm({ ...form, amount: v })}
              />

              <div className="relative">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full h-11 border rounded px-3"
                >
                  <option value="Dr">Debit</option>
                  <option value="Cr">Credit</option>
                </select>
              </div>

              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(v) => setForm({ ...form, date: v })}
              />

              <div className="col-span-3 flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-black text-white rounded"
                >
                  {editItem ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, amount, color }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      <div className={`text-2xl font-semibold ${color}`}>
        ₹ {amount.toLocaleString()}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", readOnly }) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full h-11 border rounded px-3 bg-white"
      />
      <label className="absolute -top-2 left-3 bg-white px-1 text-xs">
        {label}
      </label>
    </div>
  );
}
