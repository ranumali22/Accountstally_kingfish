import { useEffect, useState, cloneElement } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  fetchCountries,
  fetchStates,
  createState,
  updateState,
  deleteState,
} from "../.../../../api";
import { showError } from "../../components/ui/alert/Alert";

/* ================= FLOATING FIELD ================= */
function FloatingField({ label, children, id }) {
  const child = cloneElement(children, {
    id,
    className: `${children.props.className} peer`,
  });

  return (
    <div className="relative">
      {child}

      <label
        htmlFor={id}
        className="
          absolute left-3 bg-white px-1 text-gray-800
          transition-all z-10 cursor-text
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
<<<<<<< HEAD
          focus:outline-none focus:border-[#FF4200] capitalize
`
/* ================= COMPONENT ================= */
export default function StateMaster() { 
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [states, setStates] = useState([]);
  const [countries, setCountries] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  //  const itemsPerPage = 10

  const [form, setForm] = useState({
    country_code_: "",
    state_name: "",
    state_code: "",
    status: true,
  });

  /* ================= LOAD COUNTRIES ================= */
  useEffect(() => {
    fetchCountries().then((res) => {
      setCountries(res.data.data);
    });
  }, []);

  /* ================= LOAD STATES ================= */
  useEffect(() => {
    loadStates();
  }, [search, page]);

  const loadStates = async () => {
    const res = await fetchStates({
      search,
      page,
      limit: itemsPerPage,
    });

    setStates(
      res.data.data.map((s) => ({
        id: s.id,
        country_id: s.country_id,
        country_code_: s.country_name,
        state_name: s.state_name,
        state_code: s.state_code,
        status: Boolean(s.status),
      })),
    );

    setTotal(res.data.pagination.total); // ✅ IMPORTANT
  };

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedCountry = countries.find(
      (c) => c.country_code_ === form.country_code_,
    );

    if (!selectedCountry) {
      showError("Invalid country selected");
      return;
    }

    const payload = {
      country_id: selectedCountry.id,
      name: form.state_name.trim(),
      state_code: form.state_code.trim(),
      status: form.status ? 1 : 0,
    };

    if (editId) {
      await updateState(editId, payload);
      setEditId(null);
    } else {
      await createState(payload);
    }

    setForm({
      country_code_: "",
      state_name: "",
      state_code: "",
      status: true,
    });

    loadStates();
  };

  const handleEdit = (s) => {
    setEditId(s.id);
    setForm({
      country_code_: s.country_code_,
      state_name: s.state_name,
      state_code: s.state_code,
      status: s.status,
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this state?")) {
      await deleteState(id);
      loadStates();
    }
  };

  /* ================= PAGINATION ================= */
  // const totalPages = Math.ceil(states.length / itemsPerPage)
  const totalPages = Math.ceil(total / itemsPerPage);

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

  return (
    <div className="max-w-12xl mx-auto mt-6 bg-white border rounded-xl shadow-sm">
      {/* HEADER */}
      <div className="px-6 py-4 border-b font-semibold">State Master</div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {/* COUNTRY */}
        <FloatingField label="Country">
          <select
            name="country_code_"
            value={form.country_code_}
            onChange={handleChange}
            className={inputClass}
            required
          >
            <option value="select country">select country</option>

            {countries.map((c) => (
              <option key={c.id} value={c.country_code_}>
                {c.country_name}
              </option>
            ))}
          </select>
        </FloatingField>

        {/* STATE NAME */}
        <FloatingField label="State Name" id="state_name">
          <input
            name="state_name"
            value={form.state_name}
            onChange={handleChange}
            placeholder=" "
            className={inputClass}
            required
          />
        </FloatingField>

        {/* STATE CODE */}
        <FloatingField label="State Code" id="state_code">
          <input
            name="state_code"
            value={form.state_code}
            onChange={handleChange}
            placeholder=" "
            className={inputClass}
            required
          />
        </FloatingField>

        {/* STATUS */}
        <FloatingField label="Status">
          <select
            value={form.status ? "1" : "0"}
            onChange={(e) =>
              setForm((p) => ({ ...p, status: e.target.value === "1" }))
            }
            className={inputClass}
          >
            <option value="" disabled hidden></option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </FloatingField>

        {/* SUBMIT */}
        <button className="bg-[#FF4200] text-white py-2 rounded-lg text-sm">
          {editId ? "Update State" : "Add State"}
        </button>
      </form>

      {/* SEARCH */}
      <div className="px-6 pb-3">
        <input
          placeholder="Search city..."
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
      {/* TABLE TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 pb-3">
        {/* Total Records */}
        <div className="text-sm text-gray-700">
          Total Records:
          <span className="font-semibold ml-1">{total}</span>
        </div>

        {/* Per Page Selector */}
        <div className="flex items-center gap-2 text-sm">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setPage(1); // 🔥 reset page
            }}
            className="border border-gray-800 rounded-lg px-2 py-1
        focus:outline-none focus:border-[#FF4200]"
          >
            <option value={5}>5 item/Page</option>
            <option value={10}>10 item/Page</option>
            <option value={25}>25 item/Page</option>
            <option value={50}>50 item/Page</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="px-6 pb-6">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">S. N.</th>
              <th className="border px-3 py-2">Country</th>
              <th className="border px-3 py-2">State</th>
              <th className="border px-3 py-2">Code</th>
              <th className="border px-3 py-2">Status</th>
              <th className="border px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {states.map((s, i) => (
              <tr key={s.id}>
                <td className="border px-3 py-2 text-center">
                  {(page - 1) * itemsPerPage + i + 1}
                </td>
                <td className="border px-3 py-2 text-center">
                  {s.country_code_}
                </td>
                <td className="border px-3 py-2">{s.state_name}</td>
                <td className="border px-3 py-2 text-center">{s.state_code}</td>
                <td className="border px-3 py-2 text-center">
                  {s.status ? "Active" : "Inactive"}
                </td>
                <td className="border px-3 py-2 text-center space-x-2">
                  {/* EDIT */}
                  <button
                    onClick={() => handleEdit(s)}
                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-blue-200"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(s.id)}
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

        {/* PAGINATION */}
        <div className="flex items-center justify-end gap-1 mt-6 flex-wrap">
          {/* PREV */}
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`px-3 py-1.5 rounded-lg border text-sm
      ${page === 1
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
          ${page === p
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
      ${page === totalPages
                ? "text-gray-400 border-gray-200 cursor-not-allowed"
                : "hover:bg-gray-100"
              }
    `}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
