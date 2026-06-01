import { createContext, useContext, useState, useEffect } from "react";

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState(null);

  // 🔥 load from localStorage on start
  useEffect(() => {
    const stored = localStorage.getItem("company_data");

    if (stored && stored !== "undefined") {
      try {
        const parsed = JSON.parse(stored);
        setCompany(parsed);
      } catch (e) {
        console.error("Invalid company_data");
        localStorage.removeItem("company_data"); // 🔥 auto fix
      }
    }
  }, []);

  // 🔥 update function
  const updateCompany = (data) => {
    if (!data) return; // 🔥 important

    setCompany(data);
    localStorage.setItem("company_data", JSON.stringify(data));
  };
  return (
    <CompanyContext.Provider value={{ company, setCompany, updateCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

// 🔥 custom hook
export const useCompany = () => useContext(CompanyContext);