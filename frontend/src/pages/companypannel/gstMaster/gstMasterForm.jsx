import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addGst, getGstById, updateGst } from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";

/* Floating Input */

const FloatingInput = ({ label, value, onChange, readOnly = false }) => (
  <div className="relative w-full">
    <input
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder=" "
      className="peer w-full h-[42px] rounded-md px-3 text-sm border border-gray-700 focus:border-[#FF4200] outline-none"
    />
    <label className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-700">
      {label}
    </label>
  </div>
);

export default function GstMasterForm() {
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;
  const companyName = companyData.name;
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    company_id: companyId || "",
    gst_number: "",
    pennumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    contact_no: "",
    email: "",
  });

  /* EDIT MODE */
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const res = await getGstById(id);

        const d = res?.data?.data;

        if (!d) return;

        setForm({
          company_id: d.company_id || companyId,
          gst_number: d.gst_number || "",
          pennumber: d.pennumber || "",
          address: d.address || "",
          city: d.city || "",
          state: d.state || "",
          pincode: d.pincode || "",
          contact_no: d.contact_no || "",
          email: d.email || "",
        });
      } catch (err) {
        console.error("GST load error", err);
      }
    };

    loadData();
  }, [id, companyId]);

  /* SUBMIT */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (id) {
        await updateGst(id, form);
        showSuccess("GST Updated Successfully");
      } else {
        await addGst(form);
        showSuccess("GST Added Successfully");
      }

      navigate("/gst-master");
    } catch (err) {
      const message = err?.response?.data?.message || "Something went wrong";

      showError(message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* HEADER */}

      <div className="bg-white border rounded-lg p-4 flex justify-between">
        <h2 className="font-semibold text-gray-800">
          {id ? "Edit GST" : "Add GST"}
        </h2>

        <button
          onClick={() => navigate("/gst-master")}
          className="px-3 py-1 border rounded text-sm"
        >
          Back
        </button>
      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-lg mt-4 p-4 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* COMPANY */}

          <div className="relative">
            <FloatingInput label="Company Name" value={companyName} readOnly />
          </div>

          <FloatingInput
            label="GST Number"
            value={form.gst_number}
            onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
          />

          <FloatingInput
            label="PAN Number"
            value={form.pennumber}
            onChange={(e) => setForm({ ...form, pennumber: e.target.value })}
          />

          <FloatingInput
            label="Contact No"
            value={form.contact_no}
            onChange={(e) => setForm({ ...form, contact_no: e.target.value })}
          />

          <FloatingInput
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <FloatingInput
            label="Pincode"
            value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
          />

          <FloatingInput
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />

          <FloatingInput
            label="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />

          <div className="md:col-span-3">
            <FloatingInput
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        {/* BUTTONS */}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="submit"
            className="px-5 py-2 bg-green-600 text-white rounded text-sm"
          >
            Save
          </button>

          <button
            type="button"
            onClick={() => navigate("/gst-master")}
            className="px-5 py-2 border rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
