// import { useState } from "react"
// import DatePicker from "react-datepicker"

// export default function ConsoleDateField() {
//   const [date, setDate] = useState(null)

//   return (
//     <div className="flex flex-col gap-1">
//       {/* <label className="text-sm font-medium text-gray-700">
//         Invoice Date <span className="text-red-500">*</span>
//       </label> */}

//       <DatePicker
//         selected={date}
//         onChange={(d) => setDate(d)}
//         placeholderText="dd/mm/yy"
//         dateFormat="dd/MM/yy"
//         showMonthDropdown
//         showYearDropdown
//         dropdownMode="select"
//         isClearable
//         todayButton="Today"
//         className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
//       />
//     </div>

    
//   )
// }




import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

export default function DatePickerInput({
  label,
  value,
  onChange,
}) {
  return (
    <>
    <div>
  <label className="block text-sm text-gray-600 mb-1">
    Start Date
  </label>

  <DatePicker
    selected={startDate}
    onChange={date => setStartDate(date)}
    dateFormat="dd-MM-yyyy"
    placeholderText="DD-MM-YYYY"
    className="w-40 rounded-lg border px-3 py-2 bg-white focus:border-[#FF4200]"
  />
</div>
<div>
  <label className="block text-sm text-gray-600 mb-1">
    End Date
  </label>

  <DatePicker
    selected={endDate}
    onChange={date => setEndDate(date)}
    dateFormat="dd-MM-yyyy"
    placeholderText="DD-MM-YYYY"
    minDate={startDate}   // 👈 end date start ke baad hi
    className="w-40 rounded-lg border px-3 py-2 bg-white focus:border-[#FF4200]"
  />
</div>
</>
  )
}
