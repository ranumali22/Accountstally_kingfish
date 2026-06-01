import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  getDepartments,
  getDesignationsByDepartment,
  createEmployee,
  updateEmployee,
  getShifts,
  getNextEmpCode,
} from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";

/* ---------------- FLOATING CONTROLS ---------------- */

const FloatingInput = ({
  label,
  required = false,
  value,
  onChange,
  type = "text",
  readOnly = false,
  list,
}) => (
  <div className="relative w-full">
    <input
      type={type}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder=" "
      list={list}
      className="peer w-full h-[44px] rounded-[10px] px-[14px] text-sm bg-white outline-none border border-gray-800 focus:border-[#FF4200]"
    />
    <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2 peer-focus:text-[#FF4200]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

const FloatingTextarea = ({ label, value, onChange, rows = 3 }) => (
  <div className="relative w-full">
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder=" "
      className="peer w-full rounded-xl px-4 py-2 text-sm bg-white outline-none border border-gray-800 resize-none focus:border-[#FF4200]"
    />
    <label className="absolute left-4 bg-white px-1 text-gray-700 text-sm -top-2 peer-focus:text-[#FF4200]">
      {label}
    </label>
  </div>
);

const FloatingDatePicker = ({
  label,
  selected,
  onChange,
  dateFormat = "dd/MM/yyyy",
}) => {
  return (
    <div className="relative">
      <DatePicker
        selected={selected}
        onChange={onChange}
        dateFormat={dateFormat}
        placeholderText=" "
        className="peer w-full h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm
           focus:outline-none focus:border-[#FF4200]"
      />
      <label className="absolute left-3 -top-2 bg-white px-1 text-xs font-medium text-gray-700 peer-focus:text-[#FF4200]">
        {label}
      </label>
    </div>
  );
};

const FloatingSelect = ({
  label,
  value,
  onChange,
  options = [],
  required = false,
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="peer w-full h-[44px] rounded-[10px] px-[14px] text-sm bg-white outline-none border border-gray-800 focus:border-[#FF4200]"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label className="absolute left-4 bg-white px-1 text-gray-800 text-sm -top-2 peer-focus:text-[#FF4200]">
        {label} {required && "*"}
      </label>
    </div>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */
const onlyDigits = (value, max) => value.replace(/\D/g, "").slice(0, max);

const formatPAN = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function EmployeeSalaryForm() {
  const navigate = useNavigate();
  const { state: editData } = useLocation();

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [salaryDate, setSalaryDate] = useState(new Date());

  // ===== SAME STATES (unchanged) =====
  const [empCode, setEmpCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [phone, setPhone] = useState("");
  const [Email, setEmail] = useState("");
  const [HomeNumber, setHomeNumber] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [pancard, setPancardNumber] = useState("");
  const [Address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState(null);
  const [narration, setNarration] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [officeOff, setOfficeOff] = useState("");
  const [errors, setErrors] = useState({});
  const [salary, setSalary] = useState("");
  const [shifts, setShifts] = useState([]);
  const [shiftTime, setShiftTime] = useState("");
  const [lunchTime, setLunchTime] = useState("");
  const [jobType, setJobType] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingType, setOpeningType] = useState("DR");
  const [openingDate, setOpeningDate] = useState(null);

  const selectedDepartment = departments.find(
    (d) => d.department_name === department,
  );

  const selectedDesignation = designations.find(
    (d) => d.designation_name === designation,
  );

  /* ================= LOAD MASTER DATA ================= */
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadEmpCode = async () => {
    try {
      const res = await getNextEmpCode();
      setEmpCode(res.data.emp_code);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!editData) {
      loadEmpCode();
    }
  }, []);

  const loadDepartments = async () => {
    const res = await getDepartments();
    setDepartments(res.data || []);
  };

  useEffect(() => {
    const dept = departments.find((d) => d.department_name === department);
    if (dept) {
      loadDesignations(dept.id);
    } else {
      setDesignations([]);
    }
  }, [department]);

  const loadDesignations = async (deptId) => {
    const res = await getDesignationsByDepartment(deptId);
    setDesignations(res.data || []);
  };

  /* ================= EDIT MODE ================= */
  useEffect(() => {
    if (editData) {
      setEmpCode(editData.emp_code || "");
      setEmployeeName(editData.employee_name || "");
      setFatherName(editData.father_name || "");
      setMotherName(editData.mother_name || "");
      setPhone(editData.phone || "");
      setEmail(editData.email || "");
      setHomeNumber(editData.home_number || "");
      setAadharNumber(editData.aadhar || "");
      setPancardNumber(editData.pan || "");
      setAddress(editData.address || "");
      setPincode(editData.pincode || "");
      setCity(editData.city || "");
      setState(editData.state || "");
      setSalary(editData.salary || "");
      setDepartment(editData.department_name || "");
      setDesignation(editData.designation_name || "");
      setOpeningBalance(editData.opening_balance || "");
      setOpeningType(editData.opening_balance_type || "DR");
      setOpeningDate(
        editData.opening_balance_date
          ? new Date(editData.opening_balance_date)
          : null,
      );
      setJoiningDate(
        editData.joining_date ? new Date(editData.joining_date) : null,
      );
      setNarration(editData.narration || "");
      setHomeNumber(editData.home_number || "");
      setWorkingHours(editData.working_hours || "");
      setOfficeOff(editData.office_off || "");
      setSalaryDate(
        editData.salary_date ? new Date(editData.salary_date) : new Date(),
      );
    }
  }, [editData]);

  /* ================= SAVE ================= */
  const saveSalary = async () => {
    const selectedDepartment = departments.find(
      (d) => d.department_name === department,
    );

    const selectedDesignation = designations.find(
      (d) => d.designation_name === designation,
    );

    if (!selectedDepartment || !selectedDesignation) {
      showError("Please select valid Department & Designation");
      return;
    }

    const payload = {
      emp_code: empCode,
      employee_name: employeeName,
      father_name: fatherName,
      mother_name: motherName,
      phone,
      email: Email,
      home_number: HomeNumber,
      aadhar: aadharNumber,
      pan: pancard,
      address: Address,
      pincode,
      city,
      salary,
      state,
      working_hours: workingHours,
      office_off: officeOff,
      shift_id: shiftTime,
      lunch_time: lunchTime,
      job_type: jobType,
      opening_balance: Number(openingBalance || 0),
      opening_type: openingType,
      opening_balance_date: openingDate
        ? openingDate.toISOString().split("T")[0]
        : null,
      department_id: selectedDepartment.id,
      designation_id: selectedDesignation.id,
      joining_date: joiningDate
        ? joiningDate.toISOString().split("T")[0]
        : null,
      salary_date: salaryDate ? salaryDate.toISOString().split("T")[0] : null,
      narration,
    };

    if (editData?.id) {
      await updateEmployee(editData.id, payload);
      showSuccess("Employee updated successfully");
    } else {
      await createEmployee(payload);
      showSuccess("Employee created successfully");
      resetForm();
    }

    navigate("/EmployeeReportTable");
  };

  const resetForm = () => {
    setEmpCode("");
    setEmployeeName("");
    setFatherName("");
    setMotherName("");
    setPhone("");
    setEmail("");
    setHomeNumber("");
    setAadharNumber("");
    setPancardNumber("");
    setAddress("");
    setPincode("");
    setCity("");
    setState("");
    setDepartment("");
    setDesignation("");
    setJoiningDate(null);
    setNarration("");
    setWorkingHours("");
    setOfficeOff("");
    setSalary("");
    setShiftTime("");
    setLunchTime("");
    setJobType("");

    // 🔥 opening fields
    setOpeningBalance("");
    setOpeningType("DR");
    setOpeningDate(null);

    setErrors({});
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const res = await getShifts();
      setShifts(res?.data?.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <div className="w-full min-h-screen bg-[#f3f3f3]">
        {/* TOP BAR */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="font-semibold text-gray-800">Employee Add</div>
        </div>

        <div className="p-4">
          <div className="bg-white border rounded-md overflow-hidden">
            {/* HEADER */}
            <div className="px-4 py-3 border-b flex justify-between">
              <span className="px-3 py-1 rounded bg-green-600 text-white text-sm font-semibold">
                Employee Add
              </span>

              <div className="col-span-2">
                <FloatingInput label="Employee Code" value={empCode} readOnly />
              </div>

              <FloatingDatePicker
                label=" Date"
                selected={salaryDate}
                onChange={(date) => setSalaryDate(date)}
                dateFormat="dd/MM/yyyy"
                className=""
              />
            </div>
            {/* EMPLOYEE INFO */}
            <div className="p-4 border-b bg-gray-50 grid grid-cols-12 gap-3">
              <div className="col-span-4">
                <FloatingInput
                  label="Employee Name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  required
                />
              </div>

              <div className="col-span-3">
                <FloatingInput
                  label="Father Name"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
              </div>

              <div className="col-span-3">
                <FloatingInput
                  label="Mother Name"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <FloatingInput
                  label="Phone"
                  value={phone}
                  onChange={(e) => {
                    const val = onlyDigits(e.target.value, 10);
                    setPhone(val);
                    if (val.length !== 10) {
                      setErrors((p) => ({
                        ...p,
                        phone: "Phone must be 10 digits",
                      }));
                    } else {
                      setErrors((p) => ({ ...p, phone: "" }));
                    }
                  }}
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>

              <div className="col-span-3">
                <FloatingInput
                  label="Email"
                  value={Email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    if (Email && !isValidEmail(Email)) {
                      setErrors((p) => ({
                        ...p,
                        email: "Invalid email address",
                      }));
                    } else {
                      setErrors((p) => ({ ...p, email: "" }));
                    }
                  }}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div className="col-span-2">
                <FloatingInput
                  label="Home Number"
                  value={HomeNumber}
                  onChange={(e) => {
                    const val = onlyDigits(e.target.value, 10);
                    setHomeNumber(val);
                    if (val.length !== 10) {
                      setErrors((p) => ({
                        ...p,
                        homeNumber: "Home Number must be 10 digits",
                      }));
                    } else {
                      setErrors((p) => ({ ...p, homeNumber: "" }));
                    }
                  }}
                />
              </div>
              <div className="col-span-3">
                <FloatingInput
                  label="Aadhar Number"
                  value={aadharNumber}
                  onChange={(e) => {
                    const val = onlyDigits(e.target.value, 12);
                    setAadharNumber(val);
                    if (val.length !== 12) {
                      setErrors((p) => ({
                        ...p,
                        aadhar: "Aadhar must be 12 digits",
                      }));
                    } else {
                      setErrors((p) => ({ ...p, aadhar: "" }));
                    }
                  }}
                />
                {errors.aadhar && (
                  <p className="text-red-500 text-xs mt-1">{errors.aadhar}</p>
                )}
              </div>
              <div className="col-span-2">
                <FloatingInput
                  label="PAN Number"
                  value={pancard}
                  onChange={(e) => {
                    const val = formatPAN(e.target.value);
                    setPancardNumber(val);

                    if (
                      val.length === 10 &&
                      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)
                    ) {
                      setErrors((p) => ({ ...p, pan: "Invalid PAN format" }));
                    } else {
                      setErrors((p) => ({ ...p, pan: "" }));
                    }
                  }}
                />
                {errors.pan && (
                  <p className="text-red-500 text-xs mt-1">{errors.pan}</p>
                )}
              </div>
              <div className="col-span-3">
                <FloatingInput
                  label="Address"
                  value={Address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <FloatingInput
                  label="Pincode"
                  value={pincode}
                  onChange={(e) => {
                    const val = onlyDigits(e.target.value, 6);
                    setPincode(val);
                    if (val.length !== 6) {
                      setErrors((p) => ({
                        ...p,
                        pincode: "Pincode must be 6 digits",
                      }));
                    } else {
                      setErrors((p) => ({ ...p, pincode: "" }));
                    }
                  }}
                />
                {errors.pincode && (
                  <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>
                )}
              </div>
              <div className="col-span-3">
                <FloatingInput
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <FloatingInput
                  label="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              <div className="col-span-3">
                <FloatingSelect
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  options={departments
                    .filter((d) => d.status === 1) // ✅ sirf active
                    .map((d) => ({
                      id: d.id,
                      value: d.department_name,
                      label: d.department_name,
                    }))}
                />
              </div>

              <div className="col-span-2">
                <FloatingSelect
                  label="Designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  options={designations.map((d) => ({
                    id: d.id,
                    value: d.designation_name,
                    label: d.designation_name,
                  }))}
                  required
                />
              </div>
              <div className="col-span-2">
                <FloatingInput
                  label="Salary"
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <FloatingInput
                  label="Working Hours"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                />
              </div>

              {/* SHIFT TIME */}

              <div className="col-span-2">
                <FloatingSelect
                  label="Shift Time"
                  value={shiftTime}
                  onChange={(e) => setShiftTime(e.target.value)}
                  options={shifts
                    .filter((s) => s.status === "active")
                    .map((s) => ({
                      id: s.id,
                      value: s.id,
                      label: `${s.shift_name} (${s.shift_start_time} - ${s.shift_end_time})`,
                    }))}
                />
              </div>

              {/* LUNCH TIME */}

              <div className="col-span-2">
                <FloatingSelect
                  label="Lunch Time"
                  value={lunchTime}
                  onChange={(e) => setLunchTime(e.target.value)}
                  options={[
                    { value: "15", label: "15 Minutes" },
                    { value: "30", label: "30 Minutes" },
                    { value: "45", label: "45 Minutes" },
                    { value: "60", label: "1 Hour" },
                    { value: "90", label: "1 Hour 30 Minutes" },
                  ]}
                />
              </div>

              {/* JOB TYPE */}

              <div className="col-span-2">
                <FloatingSelect
                  label="Job Type"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  options={[
                    { id: 1, value: "full_time", label: "Full Time" },
                    { id: 2, value: "part_time", label: "Part Time" },
                    { id: 3, value: "hourly", label: "Hourly" },
                  ]}
                />
              </div>
              <div className="col-span-2">
                <FloatingInput
                  label="Office Off"
                  value={officeOff}
                  onChange={(e) => setOfficeOff(e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <div className="relative w-full">
                  <DatePicker
                    selected={joiningDate}
                    onChange={(date) => setJoiningDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText=" "
                    className="peer w-full h-[42px] rounded-lg border border-gray-800 bg-white px-3 text-sm
                                 focus:outline-none focus:border-[#FF4200]"
                  />
                  <label className="absolute left-3 -top-2 bg-white px-1 text-xs font-medium text-gray-700 peer-focus:text-[#FF4200]">
                    Joining Date
                  </label>
                </div>
              </div>

              <div className="col-span-2">
                <FloatingInput
                  label="Opening Balance"
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <FloatingSelect
                  label="Opening Type"
                  value={openingType}
                  onChange={(e) => setOpeningType(e.target.value)}
                  options={[
                    { id: 1, value: "DR", label: "Debit (DR)" },
                    { id: 2, value: "CR", label: "Credit (CR)" },
                  ]}
                />
              </div>

              <div className="col-span-3">
                <FloatingDatePicker
                  label="Opening Date"
                  selected={openingDate}
                  onChange={(date) => setOpeningDate(date)}
                />
              </div>
            </div>

            {/* NARRATION */}
            <div className="p-4 border-t">
              <FloatingTextarea
                label="Narration"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>

            {/* ACTIONS */}
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={saveSalary}
                className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save & Exit
              </button>

              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
