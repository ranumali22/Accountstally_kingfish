import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import "react-datepicker/dist/react-datepicker.css";

import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { CompanyProvider } from "./context/CompanyContext";
import { LoaderProvider } from "./context/LoaderContext"; // ✅ ADD THIS

/* ✅ Toast */
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ✅ Create root */
const root = createRoot(document.getElementById("root"));

/* ✅ Render */
root.render(
  <StrictMode>
    <CompanyProvider>
      <ThemeProvider>
        <LoaderProvider>
          <>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              newestOnTop
              closeOnClick
              pauseOnHover
              draggable
              theme="light"
              style={{ zIndex: 999999 }}
            />
          </>
        </LoaderProvider>
      </ThemeProvider>
    </CompanyProvider>
  </StrictMode>,
);

/* ✅ Hide loader after render */
setTimeout(() => {
  const loader = document.getElementById("global-loader");
  if (loader) {
    loader.style.opacity = "0";

    setTimeout(() => {
      loader.style.display = "none";
    }, 300);
  }
}, 300);
