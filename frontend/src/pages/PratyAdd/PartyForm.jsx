import { useEffect, useRef, useState } from "react";
import { fetchPincodeDetails, searchParty } from "../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { showError, showSuccess } from "../../components/ui/alert/Alert";

const OTP_LENGTH = 6;
const MOCK_OTP = "123456";

/* ================= FLOATING INPUT ================= */
function FloatingInput({
  label,
  value,
  onChange,
  disabled = false,
  rightSlot = null,
  required = false,
  type = "text",
}) {
  return (
    <div className="relative mb-4 md:mb-0">
      <input
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        type={type}
        placeholder=" "
        className={`
  peer w-full rounded-xl border border-gray-300 shadow-sm
  px-3 pt-4 pb-2 text-sm md:text-base bg-white
  focus:outline-none focus:border-[#FF4200] focus:ring-2 focus:ring-[#FF4200]/20
  transition-all duration-200
  ${disabled ? "bg-green-50 border-green-400" : ""}
`}
      />

      <label
        className="
          absolute left-3 bg-white px-1 text-gray-400 peer-focus:text-[#FF4200]
          transition-all z-10
          -top-2 text-sm
          peer-placeholder-shown:text-gray-800
          peer-focus:-top-2
          peer-focus:text-sm
          peer-focus:text-[#FF4200] capitalize
        "
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {rightSlot && (
        <div className="absolute right-3 top-3 z-20">{rightSlot}</div>
      )}
    </div>
  );
}

const FloatingDatePicker = ({ label, value, onChange }) => {
  return (
    <div className="relative w-full mb-4 md:mb-0 w-full">
      <DatePicker
        selected={value ? new Date(value) : null}
        onChange={(date) =>
          onChange(date ? date.toISOString().split("T")[0] : "")
        }
        dateFormat="dd/MM/yyyy"
        placeholderText=" "
        className="peer w-full min-w-full block rounded-xl border border-gray-300 shadow-sm px-3 pt-4 pb-2 text-sm md:text-base bg-white focus:outline-none focus:border-[#FF4200] focus:ring-2 focus:ring-[#FF4200]/20"
      />

      <label className="absolute left-3 bg-white px-1 text-gray-400 peer-focus:text-[#FF4200] text-sm -top-2 peer-focus:text-[#FF4200]">
        {label}
      </label>
    </div>
  );
};

/* ================= OTP FIELD ================= */
function OtpVerifyField({ label, value, setValue, required = false }) {
  const [verified, setVerified] = useState(false);
  const [open, setOpen] = useState(false);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const otpRefs = useRef([]);

  const sendOtp = () => {
    if (!value) return showError(`Enter ${label}`);
    setOpen(true);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (val, index) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  useEffect(() => {
    const entered = otp.join("");
    if (entered.length === OTP_LENGTH) {
      if (entered === MOCK_OTP) {
        setVerified(true);
        setOpen(false);
      } else {
        showError("Invalid OTP");
        setOtp(Array(OTP_LENGTH).fill(""));
        otpRefs.current[0]?.focus();
      }
    }
  }, [otp]);

  return (
    <>
      <FloatingInput
        label={label}
        value={value}
        required={required}
        disabled={verified}
        onChange={(e) => {
          const onlyNumber = e.target.value.replace(/\D/g, "");

          if (label === "Aadhaar Number") {
            if (onlyNumber.length <= 12) setValue(onlyNumber);
            return;
          }

          if (label === "Mobile Number") {
            if (onlyNumber.length <= 10) setValue(onlyNumber);
            return;
          }

          setValue(e.target.value);
        }}
        rightSlot={
          verified ? (
            <span className="text-green-600 text-xs font-medium">
              ✅ Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={sendOtp}
              className="px-3 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              🔒 Send OTP
            </button>
          )
        }
      />

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] p-6 relative animate-scaleIn">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-50 w-9 h-9 flex items-center justify-center 
             rounded-full bg-red-500 text-white text-lg font-bold 
             hover:bg-red-600 shadow-lg transition"
              title="Close"
            >
              ✕
            </button>

            {/* HEADER */}
            <h3 className="text-xl font-semibold text-gray-800 text-center">
              OTP Verification
            </h3>
            <p className="text-sm text-gray-400 peer-focus:text-[#FF4200] text-center mt-1">
              Enter OTP sent to your {label}
            </p>

            {/* OTP INPUTS */}
            <div className="flex justify-center gap-2 my-5">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  value={d}
                  onChange={(e) => handleOtpChange(e.target.value, i)}
                  maxLength={1}
                  className="w-11 h-11 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                />
              ))}
            </div>

            {/* FOOTER */}
            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={() => setOtp(Array(OTP_LENGTH).fill(""))}
                className="text-sm text-gray-400 peer-focus:text-[#FF4200] hover:text-gray-700"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= PARTY FORM ================= */
export default function PartyForm({ editData, API_BASE, onSuccess }) {
  const companyData = JSON.parse(localStorage.getItem("company_data"));
  const COMPANY_ID = companyData?.id;
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingType, setOpeningType] = useState("DR");
  const [openingDate, setOpeningDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [userType, setUserType] = useState("user");
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [gstType, setGstType] = useState("not_gst");
  const [gst, setGst] = useState("");
  const [company, setCompany] = useState("");
  const [branchName, setBranchName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [branchType, setBranchType] = useState("");
  const [transportId, setTransportId] = useState("");
  const [pan, setPan] = useState("");
  const [branch, setBranch] = useState("");
  const [tds, setTds] = useState("no");
  const [commission, setCommission] = useState("");
  const [commissionUnit, setCommissionUnit] = useState("kg");
  const [ewbTransportId, setEwbTransportId] = useState("");
  const [serviceTax, setServiceTax] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [branches] = useState([""]);
  const [partySearch, setPartySearch] = useState("");
  const [partyList, setPartyList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredBranches = branches.filter((b) => b.type === branchType);
  const isBranchSelected = branchType === "branch";

  useEffect(() => {
    setBranch("");
  }, [branchType]);

  useEffect(() => {
    if (userType === "user") setBranchName("");
    else setCompany("");
  }, [userType]);

  useEffect(() => {
    if (!partySearch.trim() || !COMPANY_ID) {
      setPartyList([]);
      return;
    }

    searchParty({ q: partySearch, company_id: COMPANY_ID })
      .then((res) => setPartyList(res.data || []))
      .catch(console.error);
  }, [partySearch, COMPANY_ID]);
  /* EDIT MODE LOAD */

  useEffect(() => {
    if (!openingBalance) {
      setOpeningType("DR");
    }
  }, [openingBalance]);

  useEffect(() => {
    if (editData) {
      console.log("Loading editData:", editData);
      setUserType(editData.user_type || "user");
      
      // Set the name fields
      const pName = editData.company_name || editData.branch_name || "";
      setCompany(pName);
      setBranchName(editData.branch_name || "");
      setPartySearch(pName); // 👈 FIXED: This was missing!

      setGstType(editData.gst_type || "not_gst");
      setGst(editData.gst_number || "");
      setContact(editData.contact_person || "");
      setPhone(editData.phone_number || "");
      setAddress(editData.address || "");
      setCity(editData.city || "");
      setState(editData.state || "");
      setStateCode(editData.state_code || "");
      setPincode(editData.pincode || "");
      setCommission(editData.broker_commission || "");
      setCommissionUnit(editData.commission_unit || "kg");
      setAadhaar(editData.aadhaar_number || "");
      setMobile(editData.mobile_number || "");
      setEmail(editData.email || "");
      setPan(editData.pan_number || "");
      setTransportId(editData.transport_id || "");
      setEwbTransportId(editData.ewb_transport_id || "");
      setServiceTax(editData.service_tax_no || "");
      setBranchType(editData.branch_type || "");
      setBranch(editData.branch_id || "");
      setTds(editData.tds_applicable || "no");
      setOpeningBalance(editData.opening_balance || "");
      setOpeningType(editData.opening_type || "DR");
      
      if (editData.opening_balance_date) {
        setOpeningDate(new Date(editData.opening_balance_date));
      }
      
      // Also lock city/state if pincode exists
      if (editData.pincode && editData.pincode.length === 6) {
        setIsAutoFilled(true);
      }
    }
  }, [editData]);

  const resetForm = () => {
    setGst("");
    setCompany("");
    setBranchName("");
    setContact("");
    setPhone("");
    setAddress("");
    setPincode("");
    setCity("");
    setState("");
    setBranchType("");
    setTransportId("");
    setPan("");
    setBranch("");
    setTds("no");
    setCommission("");
    setCommissionUnit("kg");
    setEwbTransportId("");
    setServiceTax("");
    setMobile("");
    setOpeningBalance("");
    setOpeningType("DR");
    setOpeningDate("");
    setEmail("");
    setAadhaar("");
    setUserType("user");
    setGstType("not_gst");
  };

  const handleSubmit = async (e, type = "exit") => {
    e.preventDefault();

    if (!COMPANY_ID)
      return showError("Company ID missing. Please login again.");
    if (openingBalance && isNaN(openingBalance)) {
      return showError("Invalid opening balance");
    }

    // validations
    // if (!address.trim()) return showError("Address is required");
    if (mobile && mobile.length !== 10)
      return showError("Mobile must be 10 digits");
    if (gstType === "gst" && !gst) {
      return showError("GST number is required");
    }
    if (!pincode) return showError("Pincode is required");
    if (pincode && pincode.length !== 6) return showError("Invalid pincode");
    if (userType === "user" && !company.trim())
      return showError("Company name required");
    if (userType === "branch" && !branchName.trim())
      return showError("Branch name required");
    if (aadhaar && aadhaar.length !== 12)
      return showError("Aadhaar must be 12 digits");
    if (pan && pan.length !== 10) return showError("PAN must be 10 characters");

    const payload = {
      id: editData?.id,
      company_id: COMPANY_ID,
      user_type: userType,
      company_name: company,
      branch_name: branchName,
      gst_type: gstType,
      gst_number: gst,
      aadhaar_number: aadhaar,
      mobile_number: mobile,
      email,
      branch_type: branchType,
      branch_id: branch || null,
      tds_applicable: tds,
      broker_commission: commission,
      commission_unit: commissionUnit,
      contact_person: contact,
      transport_id: transportId,
      pan_number: pan,
      ewb_transport_id: ewbTransportId,
      service_tax_no: serviceTax,
      phone_number: phone,
      opening_balance: Number(openingBalance || 0),
      opening_type: openingType,
      opening_balance_date: openingDate,
      address,
      pincode,
      city,
      state,
      state_code: stateCode,
    };

    console.log("Payload:", payload);

    const res = await fetch(API_BASE, {
      method: editData ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let result = {};
    try {
      result = await res.json();
    } catch (err) {
      console.error("Invalid JSON response", err);
    }

    if (!res.ok) {
      showError(result.error || result.message || "Server Error");
      return;
    }

    showSuccess(result.message || "Success");

    if (type === "continue") {
      resetForm();
      return;
    }

    if (type === "exit") {
      onSuccess?.("exit");
    }
  };

  return (
    <form
      className="
  p-6 bg-white rounded-2xl shadow-md
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5
"
    >
      <div className="relative">
        <FloatingInput
          required
          label="Party Name"
          value={partySearch}
          onChange={(e) => {
            setPartySearch(e.target.value);
            setCompany(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />

        {showDropdown && partySearch && (
          <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-52 overflow-auto">
            {partyList.length > 0 ? (
              partyList.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setCompany(p.company_name);
                    setPartySearch(p.company_name);
                    setShowDropdown(false);
                  }}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-b"
                >
                  <div className="flex justify-between text-sm font-semibold">
                    {p.company_name}
                    <span className="text-green-600 text-xs">✔ Exists</span>
                  </div>

                  <div className="text-xs text-gray-500">
                    📞 {p.mobile_number || "-"} | {p.city || "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                No existing party → New will be created
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative mb-4 md:mb-0">
        <select
          value={gstType}
          onChange={(e) => setGstType(e.target.value)}
          className="peer w-full rounded-xl border border-gray-800
          px-1 pt-3 pb-2 text-sm md:text-base bg-white
          focus:outline-none focus:border-[#FF4200] capitalize"
        >
          <option value="gst">GST</option>
          <option value="not_gst">Not GST</option>
        </select>

        <label
          className="
              absolute left-3 bg-white px-1 text-gray-800
          transition-all z-10
          -top-2 text-sm
          peer-focus:text-[#FF4200] capitalize"
        >
          GST Type
        </label>
      </div>

      <FloatingInput
        label="GST Number"
        value={gst}
        disabled={gstType === "not_gst"}
        onChange={(e) => {
          const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (v.length <= 15) setGst(v);
        }}
      />

      <OtpVerifyField
        label="Aadhaar Number"
        value={aadhaar}
        setValue={setAadhaar}
      />

      <FloatingInput
        label="Contact Person"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />

      <FloatingInput
        label="PAN Number"
        value={pan}
        onChange={(e) => {
          const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (v.length <= 10) setPan(v);
        }}
      />

      <div className="sm:col-span-1">
        <OtpVerifyField
          label="Mobile Number"
          value={mobile}
          setValue={setMobile}
        />
      </div>
      <div className="sm:col-span-1">
        <OtpVerifyField label="Email" value={email} setValue={setEmail} />
      </div>

      <FloatingInput
        label="Phone Number"
        value={phone}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          if (v.length <= 10) setPhone(v);
        }}
      />

      <FloatingInput
        label="Opening Balance"
        value={openingBalance}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, "");
          setOpeningBalance(v);
        }}
      />

      <div className="relative">
        <select
          value={openingType}
          onChange={(e) => setOpeningType(e.target.value)}
          className="peer w-full rounded-xl border border-gray-800 px-1 pt-3 pb-2"
        >
          <option value="DR">Debit (DR)</option>
          <option value="CR">Credit (CR)</option>
        </select>

        <label className="absolute left-3 -top-2 bg-white px-1 text-sm">
          Balance Type
        </label>
      </div>

      <FloatingDatePicker
        label="Opening Date"
        value={openingDate}
        onChange={(val) => {
          setOpeningDate(new Date(val));
        }}
      />
      <FloatingInput
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <FloatingInput
       required
        label="Pincode"
        value={pincode}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          if (v.length > 6) return;

          setPincode(v);

          // if (v.length === 6) {
          //   fetchPincodeDetails(v)
          //     .then((res) => {
          //       const d = res.data.data;
          //       setCity(d.city_name || "");
          //       setState(d.state_name || "");
          //       setStateCode(d.state_code || "");
          //     })
          //     .catch((err) => {
          //       console.error("Invalid pincode", err);
          //       setCity("");
          //       setState("");
          //     });
          // }

          if (v.length === 6) {
            fetchPincodeDetails(v)
              .then((res) => {
                const d = res.data.data;

                setCity(d.city_name || "");
                setState(d.state_name || "");
                setStateCode(d.state_code || "");

                setIsAutoFilled(true); // ✅ lock fields
              })
              .catch(() => {
                setCity("");
                setState("");
                setStateCode("");
                setIsAutoFilled(false);
              });
          }

          if (v.length < 6) {
            setCity("");
            setState("");
            setStateCode("");
            setIsAutoFilled(false); // ✅ unlock (but empty)
          }

          if (v.length < 6) {
            setCity("");
            setState("");
          }
        }}
      />

      <FloatingInput
        label="City"
        value={city}
        disabled={isAutoFilled}
        onChange={(e) => setCity(e.target.value)}
      />

      <FloatingInput
        label="State"
        value={state}
        disabled={isAutoFilled}
        onChange={(e) => setState(e.target.value)}
      />

      <FloatingInput
        label="State Code"
        value={stateCode}
        disabled={isAutoFilled}
        onChange={(e) => setStateCode(e.target.value)}
      />

      <div
        className="col-span-2 sm:col-span-2 lg:col-span-3 
      flex flex-col sm:flex-row gap-3 mt-4"
      >
        {/* Save & Continue */}
        <button
          type="button"
          onClick={(e) => handleSubmit(e, "continue")}
          className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save & Continue
        </button>

        {/* Save & Exit */}
        <button
          type="button"
          onClick={(e) => handleSubmit(e, "exit")}
          className="w-full sm:w-auto px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save & Exit
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={() => onSuccess?.("cancel")}
          className="w-full sm:w-auto px-5 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
