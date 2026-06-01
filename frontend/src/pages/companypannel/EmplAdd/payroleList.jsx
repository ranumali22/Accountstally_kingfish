import React, { useState } from "react";
import { Eye, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PayrollList() {

  const navigate = useNavigate();

  const [search,setSearch] = useState("");

  /* ================= STATIC DATA ================= */

  const employees = [
    {
      emp_code:"EMP001",
      name:"Rahul Sharma",
      workingDays:26,
      presentDays:25,
      leaveDays:1,
      salary:30000,
      netSalary:29800
    },
    {
      emp_code:"EMP002",
      name:"Amit Verma",
      workingDays:26,
      presentDays:24,
      leaveDays:2,
      salary:25000,
      netSalary:24200
    },
    {
      emp_code:"EMP003",
      name:"Sandeep Kumar",
      workingDays:26,
      presentDays:26,
      leaveDays:0,
      salary:28000,
      netSalary:28000
    },
    {
      emp_code:"EMP004",
      name:"Vikas Singh",
      workingDays:26,
      presentDays:23,
      leaveDays:3,
      salary:27000,
      netSalary:25800
    },
    {
      emp_code:"EMP005",
      name:"Manoj Gupta",
      workingDays:26,
      presentDays:25,
      leaveDays:1,
      salary:26000,
      netSalary:25500
    }
  ];

  /* ================= SEARCH ================= */

  const filtered = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.emp_code.toLowerCase().includes(search.toLowerCase())
  );

  return (

    <div className="bg-white rounded-xl shadow-md p-4 border">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-3">

        <div>
          <h2 className="text-lg font-semibold">
            Payroll Generated Employees
          </h2>

          <p className="text-sm text-gray-500">
            Total Records : {filtered.length}
          </p>
        </div>

        <input
          type="text"
          placeholder="Search employee..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64"
        />

      </div>

      {/* TABLE */}

      <div className="overflow-x-auto">

        <table className="w-full text-sm border-collapse">

          <thead className="bg-gray-700 text-white">

            <tr>
              <th className="border px-3 py-2">Sr</th>
              <th className="border px-3 py-2">Emp Code</th>
              <th className="border px-3 py-2">Employee</th>
              <th className="border px-3 py-2">Working Days</th>
              <th className="border px-3 py-2">Present</th>
              <th className="border px-3 py-2">Leave</th>
              <th className="border px-3 py-2">Salary</th>
              <th className="border px-3 py-2">Net Salary</th>
              <th className="border px-3 py-2 text-center">Action</th>
            </tr>

          </thead>

          <tbody>

            {filtered.length === 0 ? (

              <tr>
                <td colSpan="9" className="text-center py-6">
                  No Payroll Generated
                </td>
              </tr>

            ) : (

              filtered.map((emp,index)=>(

                <tr key={emp.emp_code} className="hover:bg-gray-50">

                  <td className="border px-3 py-2 text-center">
                    {index+1}
                  </td>

                  <td className="border px-3 py-2">
                    {emp.emp_code}
                  </td>

                  <td className="border px-3 py-2">
                    {emp.name}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    {emp.workingDays}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    {emp.presentDays}
                  </td>

                  <td className="border px-3 py-2 text-center">
                    {emp.leaveDays}
                  </td>

                  <td className="border px-3 py-2">
                    ₹ {emp.salary}
                  </td>

                  <td className="border px-3 py-2 font-semibold text-green-600">
                    ₹ {emp.netSalary}
                  </td>

                  <td className="border px-3 py-2">

                    <div className="flex justify-center gap-2">

                      <button
                        onClick={()=>navigate("/EmployeeSalaryView",{state:emp})}
                        className="p-2 bg-gray-100 rounded-md"
                      >
                        <Eye size={16}/>
                      </button>

                      <button
                        onClick={()=>navigate("/SalaryPayment",{state:emp})}
                        className="p-2 bg-green-100 text-green-600 rounded-md"
                      >
                        <Printer size={16}/>
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