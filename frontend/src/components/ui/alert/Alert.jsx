// import { toast } from "react-toastify";

// export const showSuccess = (msg) => {
//   toast.success(msg || "Success");
// };

// export const showError = (err) => {
//   const msg =
//     err?.response?.data?.error ||
//     err?.response?.data?.message ||
//     err?.message ||
//     "Something went wrong";

//   toast.error(msg);
// };

// export const showWarning = (msg) => {
//   toast.warning(msg);
// };

// export const showInfo = (msg) => {
//   toast.info(msg);
// };



import { toast } from "react-toastify";

export const showSuccess = (msg) => {
  toast.success(msg || "Success");
};

export const showError = (err) => {
  let msg = "";

  // ✅ Case 1: direct string
  if (typeof err === "string") {
    msg = err;
  }

  // ✅ Case 2: backend response object (fetch wala)
  else if (err?.error || err?.message) {
    msg = err.error || err.message;
  }

  // ✅ Case 3: axios error (future safe)
  else if (err?.response?.data) {
    msg = err.response.data.error || err.response.data.message;
  }

  // ❌ fallback
  else {
    msg = "Something went wrong";
  }

  toast.error(msg);
};

export const showWarning = (msg) => {
  toast.warning(msg);
};

export const showInfo = (msg) => {
  toast.info(msg);
};