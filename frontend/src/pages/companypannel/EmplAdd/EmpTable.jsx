import { Eye, Pencil, Printer, Trash2, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

import {
  getEmployees,
  deleteEmployee,
  toggleEmployeeStatus,
} from "../../../api";
import { showError } from "../../../components/ui/alert/Alert";

export default function EmployeeReportTable() {
  const navigate = useNavigate();

  // ✅ LOCAL LOADING (UI same rahega)
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await getEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      showError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee?")) return;

    try {
      setLoading(true);

      await deleteEmployee(id);

      // ✅ NO reload → no flicker
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch {
      showError("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATUS TOGGLE ================= */
  const handleStatusToggle = async (id) => {
    try {
      setLoading(true);

      await toggleEmployeeStatus(id);

      // ✅ instant update
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: e.status ? 0 : 1 } : e
        )
      );
    } catch {
      showError("Status update failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SEARCH ================= */
  const filteredEmployees = employees.filter(
    (e) =>
      e.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.phone?.includes(search) ||
      e.emp_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg font-semibold">Employee Report</h2>
          <p className="text-sm text-gray-500">
            Total Records: {filteredEmployees.length}
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search Employee / Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none"
          />
          <button
            onClick={() => navigate("/EmployeeForm")}
            className="px-4 py-2 bg-[#22A586] text-white rounded-lg text-sm font-medium "
          >
            + Add Employee
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse rounded-lg overflow-hidden">
          <thead className="bg-gray-600 text-white">
            <tr>
              <th className="border px-3 py-2 text-center">Sr</th>
              <th className="border px-3 py-2">Emp Code</th>
              <th className="border px-3 py-2">Name</th>
              <th className="border px-3 py-2">Father</th>
              <th className="border px-3 py-2">Phone</th>
              <th className="border px-3 py-2">Email</th>
              <th className="border px-3 py-2">Department</th>
              <th className="border px-3 py-2">Salary</th>
              <th className="border px-3 py-2">Joining</th>
              <th className="border px-3 py-2">Opening balance</th>
              <th className="border px-3 py-2 text-center">Status</th>
              <th className="border px-3 py-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center py-6">
                  Loading...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-6">
                  No records found
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, index) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2 text-center">{index + 1}</td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {emp.emp_code}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap ">
                    {emp.employee_name}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {emp.father_name || "-"}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {emp.phone}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {emp.email || "-"}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {emp.department_name}
                  </td>

                  <td className="border px-3 py-2 whitespace-nowrap">
                    {emp.salary ? `₹ ${emp.salary}` : "-"}
                  </td>

                  <td className="border px-3 py-2">
                    {emp.joining_date
                      ? new Date(emp.joining_date).toLocaleDateString("en-GB")
                      : "-"}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {emp.opening_balance
                      ? `₹ ${emp.opening_balance} ${emp.opening_balance_type}`
                      : "-"}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        emp.status
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {emp.status ? "active" : "inactive"}
                    </span>
                  </td>

                  <td className="border px-3 py-2">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() =>
                          navigate("/EmployeeSalaryView", { state: emp })
                        }
                        className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        onClick={() =>
                          navigate("/EmployeeForm", { state: emp })
                        }
                        className="p-2 bg-blue-100 text-blue-600 rounded-md"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() =>
                          navigate("/EmployeeSalaryView", { state: emp })
                        }
                        className="p-2 bg-green-100 text-green-600 rounded-md"
                      >
                        <Printer size={16} />
                      </button>

                      <button
                        onClick={() => handleStatusToggle(emp.id)}
                        className={`p-2 rounded-md ${
                          emp.status
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}
                        title="Toggle Status"
                      >
                        <Power size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-md"
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
  );
}