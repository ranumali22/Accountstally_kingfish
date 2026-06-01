import React, { useState, useEffect } from "react";
import { getPayroll, generateSalary } from "../../../api";
import { showSuccess } from "../../../components/ui/alert/Alert";

export default function Payrollgenerate() {
  // ❌ removed LoaderContext
  const [loading, setLoading] = useState(false);

  const [month, setMonth] = useState("2026-03");
  const [attendance, setAttendance] = useState({});
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState([]);

  const overtimeRate = 200;

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    loadPayroll();
  }, [month]);

  const loadPayroll = async () => {
    try {
      setLoading(true);

      const res = await getPayroll(month);
      setEmployees(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= HANDLE INPUT ================= */
  const handleChange = (id, field, value) => {
    setAttendance((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: Number(value),
      },
    }));
  };

  /* ================= CHECKBOX ================= */
  const toggleSelect = (id) => {
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  /* ================= SALARY CALCULATION ================= */
  const calculateSalary = (emp) => {
    const data = attendance[emp.id] || {};

    const workingDays = data.workingDays || emp.working_days || 26;
    const leaveDays = data.leaveDays || emp.leave_days || 0;
    const overtime = data.overtime || emp.overtime_hours || 0;

    const perDaySalary = (emp.salary || 0) / workingDays;
    const leaveDeduction = leaveDays * perDaySalary;
    const overtimeAmount = overtime * overtimeRate;

    const netSalary = (emp.salary || 0) - leaveDeduction + overtimeAmount;

    return { netSalary };
  };

  /* ================= BULK GENERATE ================= */
  const handleBulkGenerate = async () => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);

    try {
      setLoading(true);

      for (let id of selectedIds) {
        const emp = employees.find((e) => e.id == id);
        if (!emp) continue;

        const data = attendance[id] || {};

        await generateSalary({
          employee_id: emp.id,
          month,
          working_days: data.workingDays || emp.working_days || 26,
          present_days: data.presentDays || emp.present_days || 26,
          leave_days: data.leaveDays || emp.leave_days || 0,
          overtime_hours: data.overtime || emp.overtime_hours || 0,
        });
      }

      await loadPayroll();
      showSuccess("Selected Salary Generated");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SEARCH ================= */
  const filteredEmployees = employees.filter((emp) => {
    return (
      emp.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.emp_code?.toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone || "").includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-[#f4f6f9] p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="bg-white shadow-md rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Payroll Management
          </h2>

          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm w-[220px]"
            />

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border px-3 py-2 rounded-lg text-sm"
            />

            <button
              onClick={handleBulkGenerate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow"
            >
              Generate Selected
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-[#1f2937] text-white text-xs uppercase">
                <tr>
                  <th className="p-3"></th>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-right">Salary</th>
                  <th className="p-3 text-center">Working</th>
                  <th className="p-3 text-center">Present</th>
                  <th className="p-3 text-center">Leave</th>
                  <th className="p-3 text-center">OT</th>
                  <th className="p-3 text-right">Net</th>
                  <th className="p-3 text-right">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-10 text-gray-500">
                      Loading data...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-10 text-gray-500">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const salary = calculateSalary(emp);

                    return (
                      <tr key={emp.id} className="border-b hover:bg-blue-50 transition">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selected[emp.id] || false}
                            onChange={() => toggleSelect(emp.id)}
                            className="w-4 h-4"
                          />
                        </td>

                        <td className="p-3 font-medium">{emp.emp_code}</td>

                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">
                              {emp.employee_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {emp.id}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 text-right font-semibold">
                          ₹ {emp.salary?.toLocaleString("en-IN")}
                        </td>

                        {[ 
                          { key: "workingDays", val: emp.working_days },
                          { key: "presentDays", val: emp.present_days },
                          { key: "leaveDays", val: emp.leave_days || 0 },
                          { key: "overtime", val: emp.overtime_hours || 0 },
                        ].map((field, i) => (
                          <td key={i} className="p-2 text-center">
                            <input
                              type="number"
                              defaultValue={field.val}
                              onChange={(e) =>
                                handleChange(emp.id, field.key, e.target.value)
                              }
                              className="w-16 border rounded-md px-2 py-1 text-center"
                            />
                          </td>
                        ))}

                        <td className="p-3 text-right font-bold text-green-600">
                          ₹ {salary.netSalary.toFixed(2)}
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              emp.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : emp.status === "generated"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {emp.status || "pending"}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={async () => {
                              try {
                                setLoading(true);

                                const data = attendance[emp.id] || {};

                                await generateSalary({
                                  employee_id: emp.id,
                                  month,
                                  working_days:
                                    data.workingDays || emp.working_days || 26,
                                  present_days:
                                    data.presentDays || emp.present_days || 26,
                                  leave_days:
                                    data.leaveDays || emp.leave_days || 0,
                                  overtime_hours:
                                    data.overtime || emp.overtime_hours || 0,
                                });

                                await loadPayroll();
                                showSuccess("Selected Salary Generated");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md text-xs"
                          >
                            Generate
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>
        </div>
      </div>
    </div>
  );
}