// import React from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { ArrowLeft, Printer } from "lucide-react";
// const company = {
//     name: "ANNU",
//     address: "Jaliya, Mahukhar, Bhilwara, Rajasthan - 311404",
//     gst: "22AAAAA0000A1Z5",
// };
// export default function EmployeeSalaryView() {
//     const { state: emp } = useLocation();
//     const navigate = useNavigate();

//     if (!emp) {
//         return <div className="p-4">No employee data found</div>;
//     }

//     return (
//         <div className="min-h-screen bg-gray-100 p-4 print:bg-white">
//             {/* TOP ACTIONS */}
//             <div className="flex justify-between mb-3 print:hidden">
//                 <button
//                     onClick={() => navigate(-1)}
//                     className="flex items-center gap-2 border px-3 py-2 rounded"
//                 >
//                     <ArrowLeft size={16} /> Back
//                 </button>

//                 <button
//                     onClick={() => window.print()}
//                     className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
//                 >
//                     <Printer size={16} /> Print
//                 </button>
//             </div>

//             {/* MAIN CARD */}
//             <div className="bg-white rounded shadow p-6">
//                 {/* HEADER */}
//                 <div className="flex justify-between border-b pb-4">
//                     {/* Company Info */}
//                     <div>
//                         <h2 className="text-xl font-bold">{company.name}</h2>
//                         <p className="text-sm">{company.address}</p>
//                         <p className="text-sm font-medium">GSTIN: {company.gst}</p>
//                     </div>

//                     {/* Invoice Box */}
//                     <div className="border rounded p-3 text-sm w-56">
//                         <div className="flex justify-between">
//                             <span> Date:</span>
//                             <span> {emp.joiningDate}</span>
//                         </div>
//                         <div className="flex justify-between">
//                             <span>Emp Code:</span>
//                             {emp.empCode}
//                         </div>
//                         <div className="flex justify-between">
//                             <span>Status:</span>
//                             <span className="font-semibold text-green-600">Paid</span>
//                         </div>
//                     </div>
//                 </div>
//                 <div className="pb-3 mb-3 mt-4 border-b">
//                     <h2 className="text-xl font-bold">Employee Details</h2>

//                 </div>
//                 {/* BASIC INFO */}
//                 <div className="grid grid-cols-3 gap-4 text-sm">
//                     <div><b>Name:</b> {emp.employeeName}</div>
//                     <div><b>Father:</b> {emp.fatherName}</div>
//                     <div><b>Mother:</b> {emp.motherName}</div>

//                     <div><b>Phone:</b> {emp.phone}</div>
//                     <div><b>Email:</b> {emp.email}</div>
//                     <div><b>Department:</b> {emp.department}</div>

//                     <div><b>Joining Date:</b> {emp.joiningDate}</div>
//                     <div><b>Status:</b> {emp.status}</div>
//                 </div>

//                 {/* OTHER DETAILS */}
//                 <div className="mt-6 grid grid-cols-3 gap-4 text-sm border-t pt-4">
//                     <div><b>Aadhar:</b> {emp.aadhar}</div>
//                     <div><b>PAN:</b> {emp.pan}</div>
//                     <div><b>Pincode:</b> {emp.pincode}</div>

//                     <div><b>City:</b> {emp.city}</div>
//                     <div><b>State:</b> {emp.state}</div>

//                     <div className="col-span-3">
//                         <b>Address:</b> {emp.address}
//                     </div>

//                     <div className="col-span-3">
//                         <b>Narration:</b> {emp.narration}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// import React from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { ArrowLeft, Printer } from "lucide-react";

// export default function EmployeeSalaryView() {
//   const { state: emp } = useLocation();
//   const navigate = useNavigate();

//   if (!emp) {
//     return <div className="p-4">No employee data found</div>;
//   }

//   return (
//     <div className="min-h-screen bg-gray-100 p-4 print:bg-white">
//       <div className="flex justify-between mb-3 print:hidden">
//         <button
//           onClick={() => navigate(-1)}
//           className="flex items-center gap-2 border px-3 py-2 rounded"
//         >
//           <ArrowLeft size={16} /> Back
//         </button>

//         <button
//           onClick={() => window.print()}
//           className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
//         >
//           <Printer size={16} /> Print
//         </button>
//       </div>

//       <div className="bg-white rounded shadow p-6">
//         <div className="pb-3 mb-3 border-b">
//           <h2 className="text-xl font-bold">Employee Details</h2>
//         </div>

//         <div className="grid grid-cols-3 gap-4 text-sm">
//           <div>
//             <b>Name:</b> {emp.employee_name}
//           </div>
//           <div>
//             <b>Father:</b> {emp.father_name}
//           </div>
//           <div>
//             <b>Mother:</b> {emp.mother_name}
//           </div>

//           <div>
//             <b>Phone:</b> {emp.phone}
//           </div>
//           <div>
//             <b>Email:</b> {emp.email}
//           </div>
//           <div>
//             <b>Department:</b> {emp.department_name}
//           </div>

//           <div>
//             <b>Joining Date:</b> {emp.joining_date}
//           </div>
//           <div>
//             <b>Status:</b> {emp.status ? "Active" : "Inactive"}
//           </div>
//         </div>

//         <div className="mt-6 grid grid-cols-3 gap-4 text-sm border-t pt-4">
//           <div>
//             <b>Aadhar:</b> {emp.aadhar}
//           </div>
//           <div>
//             <b>PAN:</b> {emp.pan}
//           </div>
//           <div>
//             <b>Pincode:</b> {emp.pincode}
//           </div>

//           <div>
//             <b>City:</b> {emp.city}
//           </div>
//           <div>
//             <b>State:</b> {emp.state}
//           </div>

//           <div className="col-span-3">
//             <b>Address:</b> {emp.address}
//           </div>

//           <div className="col-span-3">
//             <b>Narration:</b> {emp.narration}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { getCompanyProfile } from "../../../api";

const API_BASE = import.meta.env.VITE_SERVER_URL;

/* ===== Small info cell ===== */
const Info = ({ label, value }) => (
  <div className="space-y-[2px]">
    <div className="text-[11px] uppercase tracking-wide text-gray-500">
      {label}
    </div>
    <div className="text-sm font-semibold text-gray-800">
      {value || "-"}
    </div>
  </div>
);

export default function EmployeeSalaryView() {
  const { state: emp } = useLocation();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatDate = (date) => {
    if (!date) return "-";
    if (date.includes("-")) {
      const [y, m, d] = date.split("-");
      return `${d}/${m}/${y}`;
    }
    return date;
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const res = await getCompanyProfile();
      setCompany(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!emp) return <div className="p-4">No employee data</div>;
  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:bg-white">
      {/* ACTION BAR */}
      <div className="flex justify-between mb-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 border bg-white px-3 py-1.5 rounded text-sm"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-1.5 rounded text-sm"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      {/* DOCUMENT */}
      <div className="bg-white rounded-lg shadow-sm p-4 max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          {/* COMPANY */}
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img
                src={`${API_BASE}/${company.logo}`}
                alt="logo"
                className="w-12 h-12 object-contain rounded border"
              />
            ) : (
              <div className="w-12 h-12 border rounded flex items-center justify-center text-xs text-gray-400">
                Logo
              </div>
            )}

            <div className="leading-tight">
              <div className="text-lg font-bold text-gray-800">
                {company.name}
              </div>
              <div className="text-xs text-gray-600 max-w-sm">
                {company.address}, {company.city}, {company.state} –{" "}
                {company.pincode}
              </div>
              {company.gst_enabled === 1 && (
                <div className="text-[11px] text-green-700 font-medium mt-0.5">
                  GSTIN: {company.gst_number}
                </div>
              )}
            </div>
          </div>

          {/* META */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-500">Date</span>
            <span className="font-medium text-right">
              {formatDate(new Date().toISOString().slice(0, 10))}
            </span>

            <span className="text-gray-500">Emp Code</span>
            <span className="font-medium text-right">{emp.emp_code}</span>

            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-green-600 text-right">
              {emp.status ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* EMPLOYEE DETAILS */}
        <div className="mb-4">
          <div className="text-xs font-bold text-gray-700 mb-2 uppercase">
            Employee Details
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Info label="Name" value={emp.employee_name} />
            <Info label="Father" value={emp.father_name} />
            <Info label="Mother" value={emp.mother_name} />

            <Info label="Phone" value={emp.phone} />
            <Info label="Email" value={emp.email} />
            <Info label="Department" value={emp.department_name} />

            <Info
              label="Joining Date"
              value={formatDate(emp.joining_date)}
            />
            <Info label="Status" value={emp.status ? "Active" : "Inactive"} />
          </div>
        </div>

        {/* OTHER INFO */}
        <div className="border-t pt-3">
          <div className="text-xs font-bold text-gray-700 mb-2 uppercase">
            Other Information
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Info label="Aadhar" value={emp.aadhar} />
            <Info label="PAN" value={emp.pan} />
            <Info label="Pincode" value={emp.pincode} />

            <Info label="City" value={emp.city} />
            <Info label="State" value={emp.state} />

            <div className="col-span-3">
              <Info label="Address" value={emp.address} />
            </div>

            <div className="col-span-3">
              <Info label="Narration" value={emp.narration} />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between mt-6 pt-3 border-t text-xs text-gray-500">
          <span>Generated by <b>{company.name}</b></span>
          <span className="font-medium">Authorized Signatory</span>
        </div>
      </div>
    </div>
  );
}
