import { useEffect, useState } from "react";
import { Eye, Pencil, Printer, Trash2, Search, Plus } from "lucide-react";
import {
  fetchCountries,
  createCountry,
  updateCountry,
  deleteCountry,
} from "../../api";
import { showError } from "../../components/ui/alert/Alert";

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
export default function CountryMaster() {
  const [countries, setCountries] = useState([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [form, setForm] = useState({
    country_name: "",
    country_code_: "",
    dial_code: "",
    status: true,
  });

  /* ================= PAGINATION ================= */
  // const itemsPerPage = 10;
  const [page, setPage] = useState(1);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.country_name.trim(),
      iso_code: form.country_code_.trim(),
      dial_code: form.dial_code.trim(),
      status: form.status ? 1 : 0,
    };

    if (!payload.name || !payload.dial_code) {
      showError("Country name and dial code are required");
      return;
    }

    if (editId) {
      await updateCountry(editId, payload);
    } else {
      await createCountry(payload);
    }

    setEditId(null);
    setForm({
      country_name: "",
      country_code_: "",
      dial_code: "",
      status: true,
    });

    const res = await fetchCountries({
      q: search,
      page,
      limit: itemsPerPage,
    });
    setCountries(res.data.data);
  };

  const handleEdit = (c) => {
    setEditId(c.id);
    setForm({
      country_name: c.country_name,
      country_code_: c.country_code_,
      dial_code: c.dial_code,
      status: c.status,
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this country?")) {
      await deleteCountry(id);
      fetchCountries({
        q: search,
        page,
        limit: itemsPerPage,
      }).then((res) => setCountries(res.data.data));
    }
  };

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    fetchCountries({
      q: search,
      page,
      limit: itemsPerPage,
    }).then((res) => {
      setCountries(res.data.data);
      setTotal(res.data.pagination.total); // ✅ IMPORTANT
    });
  }, [search, page, itemsPerPage]);

  const totalPages = Math.ceil(countries.length / itemsPerPage);

  return (
    <div className="max-w-12xl mx-auto mt-6 bg-white border rounded-xl shadow-sm">
      {/* HEADER */}
      <div className="px-6 py-4 border-b font-semibold">Country Master</div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <FloatingField label="Country Name" id="country-name">
          <input
            id="country-name"
            name="country_name"
            value={form.country_name}
            onChange={handleChange}
            placeholder=" "
            className={inputClass}
            required
          />
        </FloatingField>

        <FloatingField label="Country Code" id="country-code">
          <input
            id="country-code"
            name="country_code_"
            value={form.country_code_}
            onChange={handleChange}
            placeholder=" "
            className={`${inputClass}`}
          />
        </FloatingField>

        <FloatingField label="Dial Code" id="dial-code">
          <input
            id="dial-code"
            name="dial_code"
            value={form.dial_code}
            onChange={handleChange}
            placeholder=" "
            className={inputClass}
            required
          />
        </FloatingField>

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

        <button className="bg-[#FF4200] text-white py-2 rounded-lg text-sm">
          {editId ? "Update Country" : "Add Country"}
        </button>
      </form>

      {/* SEARCH */}
      <div className="px-6 pb-3">
        <input
          placeholder="Search country..."
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
        {/* Total Records */}
        <div className="text-sm text-gray-700">
          Total Records:
          <span className="font-semibold ml-1">{countries.length}</span>
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
              <th className="border px-3 py-2">S.N.</th>
              <th className="border px-3 py-2">Country</th>
              <th className="border px-3 py-2">Code</th>
              <th className="border px-3 py-2">Dial</th>
              <th className="border px-3 py-2">Status</th>
              <th className="border px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.id}>
                <td className="border px-3 py-2 text-center">{c.id}</td>
                <td className="border px-3 py-2">{c.country_name}</td>
                <td className="border px-3 py-2 text-center">
                  {c.country_code_}
                </td>
                <td className="border px-3 py-2 text-center">{c.dial_code}</td>
                <td className="border px-3 py-2 text-center">
                  {c.status ? "Active" : "Inactive"}
                </td>
                <td className="border px-3 py-2 text-center space-x-2">
                  {/* <button
                    onClick={() => handleEdit(c)}
                    className="text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button> */}

                  {/* EDIT */}
                  <button
                    onClick={() => handleEdit(c)}
                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-blue-200"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(c.id)}
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
        <div className="flex gap-2 justify-end mt-4">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 border rounded ${
                page === i + 1 ? "bg-[#FF8326] text-white" : ""
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
