import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { showError } from "../../components/ui/alert/Alert";

export default function ConsoleBillForm({ onSave, initialData }) {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const phoneRegex = /^[6-9]\d{9}$/;
  const numberRegex = /^\d*\.?\d{0,2}$/;
  const pincodeRegex = /^[1-9][0-9]{5}$/;

  const [form, setForm] = useState(
    initialData || {
      user_type: "",
      branch: "",
      company_name: "",
      pincode: "",
      city: "",
      state: "",
      address: "",
      gst_no: "",
      email: "",
      phone: "",
      start_date: "2026-01-07",
      end_date: "2026-01-07",
      invoice_date: "dd-mm-yyyy",
      payment_mode: "",

      sub_total: "",
      igst: "",
      cgst: "",
      sgst: "",
      grand_total: "",
      description: "",
      lr_numbers: "",
    }
  );

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());


  const handleChange = (e) => {
    const { name, value } = e.target;

    // 📱 PHONE – only numbers & max 10
    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    // 🧾 GST – uppercase + max 15
    if (name === "gst_no") {
      if (value.length > 15) return;
      setForm((prev) => ({ ...prev, gst_no: value.toUpperCase() }));
      return;
    }

    // 📍 PIN CODE – only numbers & max 6
    if (name === "pincode") {
      if (!/^\d*$/.test(value)) return; // only digits
      if (value.length > 6) return; // max 6 digits
    }

    // 💰 AMOUNT FIELDS
    if (["sub_total", "igst", "cgst", "sgst", "grand_total"].includes(name)) {
      if (!numberRegex.test(value)) return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };


  const handleSubmit = (e) => {
    e.preventDefault();

    // PHONE
    if (form.phone && !phoneRegex.test(form.phone)) {
      showError("Enter valid 10-digit mobile number");
      return;
    }

    // PIN CODE
    if (form.pincode && !pincodeRegex.test(form.pincode)) {
      showError("Enter valid 6-digit pin code");
      return;
    }

    // GST
    if (form.gst_no && !gstRegex.test(form.gst_no)) {
      showError("Invalid GST number format");
      return;
    }

    // NUMBERS
    const amountFields = ["sub_total", "igst", "cgst", "sgst", "grand_total"];
    for (let field of amountFields) {
      if (form[field] && isNaN(Number(form[field]))) {
        showError(`${field.replace("_", " ")} must be a number`);
        return;
      }
    }

    // DEFAULT VALUES
    const finalData = {
      ...form,
      sub_total: form.sub_total || "0.00",
      igst: form.igst || "0.00",
      cgst: form.cgst || "0.00",
      sgst: form.sgst || "0.00",
      grand_total: form.grand_total || "0.00",
    };

    onSave(finalData);
    console.log("FORM DATA:", finalData);
  };

  return (
    <div className="min-h-screen bg-[#f6f1eb] ">
      <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-6">Console Bill</h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-3"
        >
          {/* ROW 1 */}
          <Input
            label="Company Name"
            id="company_name"
            required
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
          />

          {/* <Input label="Pin Code" id="pincode" required name="pincode" value={form.pincode} onChange={handleChange} /> */}
          <div>
            <Input
              label="Pin Code"
              id="pincode"
              required
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              placeholder="6 digit pin code"
            />
          </div>

          {/* ROW 2 */}

          <Input
            label="City"
            required
            id="city"
            name="city"
            value={form.city}
            onChange={handleChange}
          />
          <Input
            label="State"
            required
            id="state"
            name="state"
            value={form.state}
            onChange={handleChange}
          />

          <div className="md:col-span-2">
            <Input
              label="Address"
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <Input
            label="GST No"
            id="gst_no"
            name="gst_no"
            value={form.gst_no}
            onChange={handleChange}
            placeholder="22AAAAA0000A1Z5"
          />

          <Input
            label="Email"
            id="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          <Input
            label="Phone"
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="10 digit mobile"
          />

          {/* ROW 3 */}

          <div
            className="
                         relative border border-gray-800 rounded-xl
                       px-3 pt-2 pb-2 bg-white
                        focus-within:border-[#FF4200]
                             "
          >
            {/* FLOATING LABEL */}
            <label
              className={`
                                absolute left-3 bg-white px-1 text-sm text-gray-700
                            transition-all duration-200
                              ${startDate
                  ? "-top-2 text-sm text-gray-700"
                  : "top-3 text-gray-500"
                }
                             peer-focus:-top-2 peer-focus:text-sm peer-focus:text-[#FF4200]
                           `}
            >
              Start Date
            </label>

            {/* DATE PICKER */}
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="dd-MM-yyyy"
              placeholderText=" "
              maxDate={new Date()}
              className="
                          peer w-full bg-transparent outline-none
                          text-sm
                          "
            />
          </div>

          {/* ✅ END DATE */}
          <div
            className="
                        relative border border-gray-800 rounded-xl
                    px-3 pt-2 pb-2 bg-white
                     focus-within:border-[#FF4200]
                         "
          >
            {/* FLOATING LABEL */}
            <label
              className={`
                             absolute left-3 bg-white px-1 text-sm text-gray-600
                             transition-all duration-200
                            ${startDate
                  ? "-top-2 text-sm text-gray-700"
                  : "top-3 text-gray-500"
                }
                          peer-focus:-top-2 peer-focus:text-sm peer-focus:text-[#FF4200]
                             `}
            >
              End Date
            </label>

            {/* DATE PICKER */}
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="dd-MM-yyyy"
              placeholderText=" "
              maxDate={new Date()}
              className="
                              peer w-full bg-transparent outline-none
                             text-sm
                           "
            />
          </div>

          {/* ROW 4 */}
          <Input
            type="date"
            label="Invoice Date"
            id="invoice_date"
            name="invoice_date"
            value={form.invoice_date}
            onChange={handleChange}
          />
          <Select
            label="Payment Mode"
            id="payment_mode"
            required
            name="payment_mode"
            value={form.payment_mode}
            onChange={handleChange}
            options={["Paid", "To-Pay", "Credit"]}
          />

          <Input
            label="Sub Total"
            id="sub_total"
            required
            name="sub_total"
            value={form.sub_total}
            onChange={handleChange}
          />

          {/* ROW 5 */}
          <Input
            label="IGST"
            id="igst"
            name="igst"
            value={form.igst}
            onChange={handleChange}
          />
          <Input
            label="CGST"
            id="cgst"
            name="cgst"
            value={form.cgst}
            onChange={handleChange}
          />
          <Input
            label="SGST"
            id="sgst"
            name="sgst"
            value={form.sgst}
            onChange={handleChange}
          />
          <Input
            label="Grand Total"
            id="grand_total"
            required
            name="grand_total"
            value={form.grand_total}
            onChange={handleChange}
          />

          {/* DESCRIPTION */}
          <div className="md:col-span-4">
            <Textarea
              label="Description"
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          {/* LR NUMBER */}
          <div className="md:col-span-4">
            <Textarea
              label="LR Number (Optional)"
              name="lr_numbers"
              value={form.lr_numbers}
              onChange={handleChange}
              placeholder="Enter LR numbers (comma separated)"
            />
          </div>

          {/* SUBMIT */}
          <div className="md:col-span-4 flex justify-center mt-4">
            <button className="bg-[#2e8b7d] hover:bg-[#267569] text-white px-10 py-2 rounded-md">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
const baseFieldClass = `
  peer w-full h-[44px]
  rounded-[10px]
  px-[14px]
  text-sm bg-white outline-none
  border border-gray-800
  focus:border-[#FF4200]
`;
function Input({ label, required, type = "text", id, ...props }) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        placeholder=" "
        {...props}
        className={baseFieldClass}
      />

      <label
        htmlFor={id}
        className="
          absolute left-4 bg-white px-1 text-gray-800 text-sm
          transition-all cursor-text
          -top-2
         
          peer-placeholder-shown:text-gray-800
          peer-focus:-top-2
          peer-focus:text-[#FF4200]
        "
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}

function Select({ label, options = [], required, id, ...props }) {
  return (
    <div className="relative">
      <select id={id} defaultValue="" {...props} className={baseFieldClass}>
        <option value="">None</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <label
        htmlFor={id}
        className="
          absolute left-4 bg-white px-1 text-gray-800 text-sm
          transition-all cursor-text
          -top-2
          peer-focus:text-[#FF4200]
        "
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}

function Textarea({ label, id, ...props }) {
  return (
    <div className="relative">
      <textarea
        id={id}
        placeholder=" "
        {...props}
        rows={3}
        className="
          peer w-full rounded-xl px-4 py-2 text-sm bg-white outline-none
          border border-gray-800 resize-none
          focus:border-[#FF4200]
        "
      />

      <label
        htmlFor={id}
        className="
          absolute left-4 bg-white px-1 text-gray-700 text-sm
          transition-all cursor-text
          -top-2
          peer-placeholder-shown:
          peer-placeholder-shown:text-gray-800
          peer-focus:-top-2
          peer-focus:text-[#FF4200]
        "
      >
        {label}
      </label>
    </div>
  );
}
