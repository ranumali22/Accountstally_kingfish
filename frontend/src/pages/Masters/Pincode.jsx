import { useEffect, useState } from "react";
import { Eye, Pencil, Printer, Trash2, Search, Plus } from "lucide-react";

import {
  fetchCountries,
  fetchStates,
  fetchCities,
  fetchPincodes,
  createPincode,
  updatePincode,
  deletePincode,
} from "../../api";

/* ================= FLOATING FIELD ================= */
function FloatingField({ label, children, id }) {
  return (
    <div className="relative">
      {children}
      <label
        htmlFor={id}
        className="
            absolute left-3 bg-white px-1 text-gray-800
          transition-all z-10
          -top-2 text-sm
          
          peer-placeholder-shown:text-gray-800
          peer-focus:-top-2
          peer-focus:text-sm
          peer-focus:text-[#FF4200] 
        "
      >
        {label}
      </label>
    </div>
  );
}

/* ================= INPUT CLASS ================= */
const inputClass = `
peer w-full rounded-xl border border-gray-800
          px-3 pt-3 pb-2 text-sm md:text-base bg-white
          focus:outline-none focus:border-[#FF4200] capitalize
`;
/* ================= COMPONENT ================= */
export default function PincodeMaster() {
  const [data, setData] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [limit, setLimit] = useState(10);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // const limit = 10
  const [total, setTotal] = useState(0);

  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    country_id: "",
    state_id: "",
    city_id: "",
    pincode: "",
    status: "1",
  });

  /* ================= LOAD COUNTRIES ================= */
  useEffect(() => {
    fetchCountries().then((res) => {
      setCountries(res.data.data || res.data);
    });
  }, []);

  /* ================= LOAD STATES ================= */
  useEffect(() => {
    if (!form.country_id) {
      setStates([]);
      return;
    }

    fetchStates({ country_id: form.country_id }).then((res) => {
      setStates(res.data.data || res.data);
    });
  }, [form.country_id]);

  /* ================= LOAD CITIES ================= */
  useEffect(() => {
    if (!form.state_id) {
      setCities([]);
      return;
    }

    fetchCities({ state_id: form.state_id }).then((res) => {
      setCities(res.data.data || res.data);
    });
  }, [form.state_id]);

  /* ================= LOAD PINCODES ================= */
  const loadPincodes = async () => {
    const res = await fetchPincodes({
      page,
      limit,
      search,
    });

    setData(res.data.data);
    setTotal(res.data.pagination.total);
  };

  useEffect(() => {
    loadPincodes();
  }, [page, search, limit]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      country_id: Number(form.country_id),
      state_id: Number(form.state_id),
      city_id: Number(form.city_id),
      pincode: form.pincode,
      oda: Number(form.status),
    };

    if (editId) {
      await updatePincode(editId, payload);
    } else {
      await createPincode(payload);
    }

    resetForm();
    loadPincodes();
  };

  const handleEdit = async (p) => {
    setEditId(p.id);

    const stateRes = await fetchStates({ country_id: p.country_id });
    setStates(stateRes.data.data || stateRes.data);

    const cityRes = await fetchCities({ state_id: p.state_id });
    setCities(cityRes.data.data || cityRes.data);

    setForm({
      country_id: String(p.country_id),
      state_id: String(p.state_id),
      city_id: String(p.city_id),
      pincode: p.pincode,
      status: String(p.oda),
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this pincode?")) return;
    await deletePincode(id);
    loadPincodes();
  };

  const resetForm = () => {
    setEditId(null);
    setForm({
      country_id: "",
      state_id: "",
      city_id: "",
      pincode: "",
      status: "1",
    });
    setStates([]);
    setCities([]);
  };

  const totalPages = Math.ceil(total / limit);

  const getPages = (current, total) => {
    const pages = [];
    const delta = 2;

    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total) {
      if (end < total - 1) pages.push("...");
      pages.push(total);
    }

    return pages;
  };

  /* ================= JSX ================= */
  return (
    <div className="w-full max-w-full mx-auto mt-6 bg-white border rounded-xl shadow-sm overflow-x-hidden">
      <div className="px-6 py-4 border-b font-semibold">Pincode Master</div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4"
      >
        <FloatingField label="Country">
          <select
            name="country_id"
            value={form.country_id}
            onChange={handleChange}
            className={inputClass}
            required
          >
            <option value="select country">select country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.country_name || c.name}
              </option>
            ))}
          </select>
        </FloatingField>

        <FloatingField label="State">
          <select
            name="state_id"
            value={form.state_id}
            onChange={handleChange}
            className={inputClass}
            required
          >
            <option value="select state">select state</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.state_name || s.name}
              </option>
            ))}
          </select>
        </FloatingField>

        <FloatingField label="City">
          <select
            name="city_id"
            value={form.city_id}
            onChange={handleChange}
            className={inputClass}
            required
          >
            <option value="select city">select city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.city_name || c.name}
              </option>
            ))}
          </select>
        </FloatingField>

        <FloatingField label="Pincode" id="pincode">
          <input
            id="pincode"
            name="pincode"
            value={form.pincode}
            onChange={handleChange}
            placeholder=" "
            className={inputClass}
            required
          />
        </FloatingField>

        <FloatingField label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className={inputClass}
          >
            <option value="" disabled hidden></option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </FloatingField>

        <button className="bg-[#FF4200] text-white py-2 rounded-lg text-sm">
          {editId ? "Update Pincode" : "Add Pincode"}
        </button>
      </form>

      {/* SEARCH */}
      <div className="px-6 pb-3">
        <input
          placeholder="Search pincode / city..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border border-gray-800 rounded-lg px-4 py-3  w-80  
  text-[#101828]
  focus:outline-none focus:border-[#FF4200]
  focus:ring-[#FF4200]"
        />
      </div>

      {/* TABLE TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 pb-3">
        {/* TOTAL */}
        <div className="text-sm text-gray-700">
          Total Records:
          <span className="font-semibold ml-1">{total}</span>
        </div>

        {/* PER PAGE */}
        <div className="flex items-center gap-2 text-sm">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border border-gray-800 rounded-lg px-2 py-1
        focus:outline-none focus:border-[#FF4200]"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="px-6 pb-6 overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">S.N</th>
              <th className="border px-3 py-2">Country</th>
              <th className="border px-3 py-2">State</th>
              <th className="border px-3 py-2">City</th>
              <th className="border px-3 py-2">Pincode</th>
              <th className="border px-3 py-2">Status</th>
              <th className="border px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={p.id}>
                <td className="border px-3 py-2 text-center">
                  {(page - 1) * limit + i + 1}
                </td>
                <td className="border px-3 py-2 text-center">
                  {p.country_name}
                </td>
                <td className="border px-3 py-2 text-center">{p.state_name}</td>
                <td className="border px-3 py-2">{p.city_name}</td>
                <td className="border px-3 py-2 text-center">{p.pincode}</td>
                <td className="border px-3 py-2 text-center">
                  {p.oda ? "Active" : "Inactive"}
                </td>
                <td className="border px-3 py-2 text-center space-x-2">
                  {/* EDIT */}
                  <button
                    onClick={() => handleEdit(p)}
                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-blue-200"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-end gap-1 mt-6 flex-wrap">
        {/* PREV */}
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={`px-3 py-1.5 rounded-lg border text-sm
      ${
        page === 1
          ? "text-gray-400 border-gray-200 cursor-not-allowed"
          : "hover:bg-gray-100"
      }
    `}
        >
          Prev
        </button>

        {getPages(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-2 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg border text-sm
          ${
            page === p
              ? "bg-[#FF4200] text-white border-[#FF4200]"
              : "hover:bg-gray-100"
          }
        `}
            >
              {p}
            </button>
          ),
        )}

        {/* NEXT */}
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className={`px-3 py-1.5 rounded-lg border text-sm
      ${
        page === totalPages
          ? "text-gray-400 border-gray-200 cursor-not-allowed"
          : "hover:bg-gray-100"
      }
    `}
        >
          Next
        </button>
      </div>
    </div>
  );
}
