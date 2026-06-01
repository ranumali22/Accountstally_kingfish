import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getPayroll,
  getBanks,
  createSalaryPayment,
  getSalaryPayments,
} from "../../../api";
import { showSuccess } from "../../../components/ui/alert/Alert";

/* ================= FLOATING ================= */

const FloatingInput = ({ label, value, onChange, readOnly, type = "text" }) => (
  <div className="relative w-full">
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      readOnly={readOnly}
      placeholder=" "
      className="peer w-full h-[44px] px-3 border border-gray-800 rounded-md outline-none focus:border-[#FF4200]"
    />
    <label className="absolute left-3 -top-2 bg-white text-xs px-1">
      {label}
    </label>
  </div>
);

const FloatingSelect = ({ label, value, onChange, options }) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={onChange}
      className="peer w-full h-[44px] border border-gray-800 rounded-md px-3 outline-none focus:border-[#FF4200]"
    >
      <option value=""></option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <label className="absolute left-3 -top-2 bg-white text-xs px-1">
      {label}
    </label>
  </div>
);

/* ================= MAIN ================= */

export default function SalaryPayment() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [bankList, setBankList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentType, setPaymentType] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    emp_code: "",
    employee_name: "",
    salary: "",
    net_salary: "",
    payment_amount: 0,
    total_dues: 0,
    remark: "",
    date: new Date(),
  });

  /* ================= LOAD ================= */

  useEffect(() => {
    loadEmployees();
    loadBanks();
  }, []);

  const loadEmployees = async () => {
    const res = await getPayroll("2026-03");
    setEmployees(res.data || []);
  };

  const loadBanks = async () => {
    const company = JSON.parse(localStorage.getItem("company_data") || "{}");
    const res = await getBanks(company.id);
    setBankList(res.data || []);
  };

  const loadPayments = async () => {
    const res = await getSalaryPayments("2026-03");

    console.log("pay salary list", res.data.data);

    setPayments(res.data.data || []); // 🔥 FIX
  };

  useEffect(() => {
    loadEmployees();
    loadBanks();
    loadPayments(); // 🔥 add this
  }, []);
  /* ================= AUTO FILL ================= */

  const handleEmpCode = (code) => {
    // set emp code
    setForm((prev) => ({ ...prev, emp_code: code }));

    // find employee
    const emp = employees.find(
      (e) => e.emp_code?.toLowerCase() === code.toLowerCase(),
    );

    if (!emp) return;

    // 🔥 STEP 1: is employee ke saare payments nikaalo
    const empPayments = payments.filter(
      (p) => Number(p.employee_id) === Number(emp.id),
    );

    // 🔥 STEP 2: total paid calculate karo
    const totalPaid = empPayments.reduce(
      (sum, p) => sum + Number(p.paid_amount || 0),
      0,
    );

    // 🔥 STEP 3: remaining salary calculate karo
    const netSalary = Number(emp.net_salary || 0);
    const remaining = netSalary - totalPaid;

    // ❌ agar already full paid hai
    if (remaining <= 0) {
      showSuccess("Salary already fully paid ✅");

      setForm({
        emp_code: emp.emp_code,
        employee_name: emp.employee_name,
        salary: emp.salary,
        net_salary: netSalary,
        payment_amount: 0,
        total_dues: 0,
        remark: "",
        date: new Date(),
      });

      return;
    }

    // 🔥 FINAL SET FORM (ONLY REMAINING)
    setForm({
      emp_code: emp.emp_code,
      employee_name: emp.employee_name,
      salary: emp.salary,
      net_salary: netSalary,
      payment_amount: remaining, // ✅ only remaining
      total_dues: remaining, // ✅ only remaining
      remark: "",
      date: new Date(),
    });
  };
  /* ================= CALC ================= */

  const calcDue = useMemo(() => {
    return Math.max(
      Number(form.total_dues || 0) - Number(form.payment_amount || 0),
      0,
    );
  }, [form.total_dues, form.payment_amount]);

  /* ================= SUBMIT ================= */

  const submit = async (e) => {
    e.preventDefault();

    if (!form.emp_code) return showError("Enter Employee Code");
    if (!paymentType) return showError("Select Payment Type");

    const emp = employees.find((e) => e.emp_code === form.emp_code);

    if (loading) return;
    setLoading(true);

    try {
      await createSalaryPayment({
        employee_id: emp.id,
        emp_code: form.emp_code,
        employee_name: form.employee_name,
        month: "2026-03",
        total_salary: form.net_salary,
        paid_amount: form.payment_amount,
        due_amount: calcDue,
        payment_type: paymentType,
        payment_mode: paymentType === "BANK" ? paymentMode : null,
        bank_id: paymentType === "BANK" ? bankName : null,
        cheque_number:
          paymentType === "BANK" && paymentMode === "CHEQUE"
            ? chequeNumber
            : null,
        cheque_date:
          paymentType === "BANK" && paymentMode === "CHEQUE"
            ? chequeDate
            : null,
        remark: form.remark,
        payment_date: form.date,
      });

      await loadPayments();
      showSuccess("Salary Paid Successfully ✅");
    } finally {
      setLoading(false);
    }

    // 🔥 refresh list
    await loadPayments();

    // 🔥 reset form
    setForm({
      emp_code: "",
      employee_name: "",
      salary: "",
      net_salary: "",
      payment_amount: "",
      total_dues: 0,
      remark: "",
      date: new Date(),
    });

    setPaymentType("");
    setPaymentMode("");
    setBankName("");
    setChequeNumber("");
    setChequeDate(null);

    showSuccess("Salary Paid Successfully ✅");
  };

  /* ================= UI ================= */

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* HEADER */}
      <div className="bg-white border rounded-xl shadow-sm p-3 flex justify-between">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <div className="font-semibold text-gray-800">Salary Payment</div>

        <DatePicker
          selected={form.date}
          onChange={(d) => setForm({ ...form, date: d })}
          className="border px-2 py-1 rounded"
        />
      </div>

      {/* FORM */}
      <form
        onSubmit={submit}
        className="bg-white border rounded-xl shadow-sm mt-4 p-4 grid grid-cols-2 lg:grid-cols-12 gap-4"
      >
        {/* EMP CODE */}
        <div className="lg:col-span-3">
          <FloatingInput
            label="Employee Code"
            value={form.emp_code}
            onChange={(e) => handleEmpCode(e.target.value)}
          />
        </div>

        {/* NAME */}
        <div className="lg:col-span-3">
          <FloatingInput
            label="Employee Name"
            value={form.employee_name}
            readOnly
          />
        </div>

        {/* SALARY */}
        <div className="lg:col-span-2">
          <FloatingInput label="Salary" value={form.salary} readOnly />
        </div>

        {/* NET */}
        <div className="lg:col-span-2">
          <FloatingInput label="Net Salary" value={form.net_salary} readOnly />
        </div>

        {/* TOTAL */}
        <div className="lg:col-span-2">
          <FloatingInput label="Total Dues" value={form.total_dues} readOnly />
        </div>

        {/* PAID */}
        <div className="lg:col-span-3">
          <FloatingInput
            label="Paid Amount"
            type="number"
            value={form.payment_amount}
            onChange={(e) =>
              setForm({ ...form, payment_amount: e.target.value })
            }
          />
        </div>

        {/* DUE */}
        <div className="lg:col-span-3">
          <FloatingInput label="Due" value={calcDue} readOnly />
        </div>

        {/* PAYMENT TYPE */}
        <div className="lg:col-span-3">
          <FloatingSelect
            label="Payment Type"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "BANK", label: "Bank" },
            ]}
          />
        </div>

        {/* BANK */}
        {paymentType === "BANK" && (
          <div className="lg:col-span-3">
            <FloatingSelect
              label="Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              options={bankList.map((b) => ({
                value: b.id,
                label: b.bank_name,
              }))}
            />
          </div>
        )}

        {/* MODE */}
        {paymentType === "BANK" && (
          <div className="lg:col-span-3">
            <FloatingSelect
              label="Payment Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={[
                { value: "UPI", label: "UPI" },
                { value: "CHEQUE", label: "Cheque" },
              ]}
            />
          </div>
        )}

        {/* CHEQUE */}
        {paymentType === "BANK" && paymentMode === "CHEQUE" && (
          <>
            <div className="lg:col-span-3">
              <FloatingInput
                label="Cheque Number"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
              />
            </div>

            <div className="lg:col-span-3">
              <DatePicker
                selected={chequeDate}
                onChange={(d) => setChequeDate(d)}
                className="border px-2 py-1 w-full rounded"
              />
            </div>
          </>
        )}

        {/* REMARK */}
        <div className="lg:col-span-12">
          <FloatingInput
            label="Narration"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />
        </div>

        {/* BUTTONS */}
        <div className="lg:col-span-12 flex justify-end gap-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Save & Continue
          </button>

          <button
            type="button"
            onClick={() => navigate("/payroll")}
            className="border px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* ================= PAYMENT LIST ================= */}
      <div className="bg-white mt-5 border rounded-xl shadow-sm p-4">
        <h3 className="font-semibold mb-3 text-gray-800">
          Salary Payment List
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="p-2">Emp Code</th>
                <th className="p-2">Name</th>
                <th className="p-2">Paid</th>
                <th className="p-2">Due</th>
                <th className="p-2">Type</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">
                    No Payments Yet
                  </td>
                </tr>
              ) : (
                payments.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{p.emp_code}</td>
                    <td className="p-2">{p.employee_name}</td>
                    <td className="p-2 text-green-600 font-semibold">
                      ₹ {p.paid_amount}
                    </td>
                    <td className="p-2 text-red-500">₹ {p.due_amount}</td>
                    <td className="p-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="p-2">
                      {new Date(p.payment_date).toLocaleDateString()}
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
