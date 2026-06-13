import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_SERVER_URL}/api`,
});

// ✅ ADD THIS BACK
API.interceptors.request.use((config) => {
  const companyToken = localStorage.getItem("company_token");

  if (companyToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${companyToken}`;
  }

  return config;
});

// ✅ RESPONSE INTERCEPTOR
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("company_token");
      localStorage.removeItem("company_data");

      alert("Session expired. Please login again.");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export const getDashboardData = () => API.get("/dashboard");
// Admin Login
export const adminLogin = (data) =>
  API.post("/admin/login", data);

export const createCompany = (formData) => {
  return API.post("/company/create", formData);
};
export const getCompanyProfile = () => API.get("/company/me");
export const getCompanies = () => API.get("/company");
export const createGroup = (data) => API.post("/group", data);
export const getGroups = () => API.get("/group");

export const getGroupsByCompany = (companyId) =>
  API.get(`/group/company/${companyId}`, {});

export const updateGroup = (groupId, data) =>
  API.put(`/group/${groupId}`, data);
export const deleteGroup = (groupId) => API.delete(`/group/${groupId}`);

export const createLedger = (data) => API.post("/ledger", data);

export const getLedgersByCompany = (companyId) =>
  API.get(`/ledger/company/${companyId}`);

// 📄 get single party by id  ✅ ADD THIS
export const getPartyById = (id) => API.get(`/party/${id}`);

export const getLedgerById = (ledgerId) => API.get(`/ledger/${ledgerId}`);

export const updateLedger = (ledgerId, data) =>
  API.put(`/ledger/${ledgerId}`, data);

export const deleteLedger = (ledgerId) => API.delete(`/ledger/${ledgerId}`);

export const getPartyLedger = (companyId, partyId) =>
  API.get("/ledger/party-ledger", {
    params: {
      company_id: companyId,
      party_id: partyId,
    },
  });

export const getAllPartyLedger = ({ company_id }) =>
  API.get("/ledger/all", {
    params: { company_id },
  });

// 🔥 FULL LEDGER (Party + Employee + Cash + Bank)
export const getAllLedgerEntries = (company_id) => {
  return API.get("/ledger/all-entries", {
    params: { company_id },
  });
};

export const getPartyWithDues = () =>
  API.get("/voucher/party/with-dues");

export const getPartyDues = (party_id) =>
  API.get(`/voucher/party/${party_id}/dues`);

export const createVoucher = (data) => API.post("/voucher/create", data);
export const updateVoucher = (id, data) => API.put(`/voucher/${id}`, data);
export const getVouchersByCompany = (params) =>
  API.get("/voucher", { params });
export const getVoucherById = (id) => API.get(`/voucher/${id}`);
export const cancelVoucher = (id) => API.post(`/voucher/${id}/cancel`);
export const getNextVoucherNumber = (voucherType) =>
  API.get(`/voucher/next-voucher/${voucherType}`);

//reports
export const getTrialBalance = () => API.get("/reports/trial-balance");
export const getProfitLoss = () => API.get("/reports/profit-loss");
export const getBalanceSheet = () => API.get("/reports/balance-sheet");

export const getDayBook = (companyId, params) =>
  API.get(`/report/day-book/${companyId}`, { params });

export const getAllTax = () => API.get("/tax");
export const createTax = (data) => API.post("/tax", data);
export const updateTax = (id, data) => API.put(`/tax/${id}`, data);
export const deleteTax = (id) => API.delete(`/tax/${id}`);
export const getActiveTax = () => API.get("/tax/active");

export const getAllUnits = () => API.get("/unit");
export const getActiveUnits = () => API.get("/unit/active");
export const createUnit = (data) => API.post("/unit", data);
export const updateUnit = (id, data) => API.put(`/unit/${id}`, data);
export const deleteUnit = (id) => API.delete(`/unit/${id}`);

export const fetchCountries = (params) =>
  API.get("/master/getCountries", { params });

export const createCountry = (data) => API.post("/master/createCountry", data);

export const updateCountry = (id, data) =>
  API.put(`/master/updateCountry/${id}`, data);

export const deleteCountry = (id) => API.delete(`/master/deleteCountry/${id}`);

// CREATE STATE
export const createState = (data) => API.post("/master/createState", data);

// GET STATES
export const fetchStates = (params = {}) =>
  API.get("/master/getStates", { params });

// UPDATE STATE
export const updateState = (id, data) =>
  API.put(`/master/updateState/${id}`, data);

// DELETE STATE
export const deleteState = (id) => API.delete(`/master/deleteState/${id}`);
export const fetchCities = (params = {}) =>
  API.get("/master/getCities", { params });
export const createCity = (data) => API.post("/master/createCity", data);
export const updateCity = (id, data) =>
  API.put(`/master/updateCity/${id}`, data);
export const deleteCity = (id) => API.delete(`/master/deleteCity/${id}`);
export const createPincode = (data) => API.post("/master/createPincode", data);
export const fetchPincodes = (params = {}) =>
  API.get("/master/getPincodes", { params });

export const fetchPincodeById = (id) => API.get(`/master/getPincode/${id}`);
export const updatePincode = (id, data) =>
  API.put(`/master/updatePincode/${id}`, data);
export const deletePincode = (id) => API.delete(`/master/deletePincode/${id}`);
export const searchParty = (params) => API.get("/party/search", { params });
export const createParty = (data) => API.post("/party", data);
export const createPurchase = (data) => API.post("/purchase", data);
// export const createPurchase = (data) =>
//   API.post("/purchase", data, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
export const updatePurchase = (id, data) => API.put(`/purchase/${id}`, data);

// export const updatePurchase = (id, data) =>
//   API.put(`/purchase/${id}`, data, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
export const getPurchasesByCompany = (params) => {
  return API.get("/purchase", {
    params: {
      ...params,
    },
  });
};

export const getPurchaseById = (billId) => {
  return API.get(`/purchase/${billId}`);
};

export const downloadPurchaseDoc = (billId) => {
  return API.get(`/purchase/download/${billId}`, {
    responseType: "blob",
  });
};

export const deletePurchase = (id) => API.delete(`/purchase/${id}`);
// export const updatePurchase = (id, data) => API.put(`/purchase/${id}`, data);
export const deleteSale = (id) => API.delete(`/sale/${id}`);
export const updateSale = (id, data) => API.put(`/sale/${id}`, data);
export const createSale = (data) => API.post("/sale", data);
export const bulkCreateSale = (data) => API.post("/sale/bulk", data);
// export const getNextSaleInvoice = () => API.get("/sale/next-invoice");
export const getNextSaleInvoice = () =>
  API.get(`/sale/next-invoice`);
export const getSaleByCompany = (params) => {
  return API.get("/sale", {
    params: {
      ...params,
    },
  });
};
export const getSales = (params) => API.get("/sale", { params });

export const getSaleById = (billId) => API.get(`/sale/${billId}`);
export const exportTallyJson = (ids) => API.get(`/sale/tally-export-json?ids=${ids}`);

export const fetchPincodeDetails = (code) =>
  API.get("/master/getPincodeDetails", {
    params: { code },
  });

export const fetchItems = () => API.get("/items");
export const createItem = (data) => API.post("/items", data);
export const updateItem = (id, data) => API.put(`/items/${id}`, data);
export const deleteItem = (id) => API.delete(`/items/${id}`);

//all expense apis
export const createExpenseMaster1 = (data) => {
  return API.post(`/master/createExpenseMaster`, data, {
    headers: { "Content-Type": "application/json" },
  });
};

export const getExpenseMaster = (params) => {
  return API.get(`/master/getExpenseMaster`, { params });
};

export const getExpenseMastertype = () => {
  return API.get(`/master/getExpenseMasterType`);
};

export const updateExpenseMasterStatus = (id, status) => {
  return API.put(
    `/master/updateExpenseMasterStatus/${id}`,
    { status },
    { headers: { "Content-Type": "application/json" } },
  );
};

export const updateExpenseMaster1 = (id, data) => {
  return API.put(`/master/updateExpenseMaster/${id}`, data, {
    headers: { "Content-Type": "application/json" },
  });
};

/* ================= EXPENSE type ================= */
export const getExpenseTypes1 = () => {
  return API.get(`/master/getExpenseMasterType`);
};

export const createExpenseType1 = (data) => {
  return API.post(`/master/createExpenseMasterType`, data, {
    headers: { "Content-Type": "application/json" },
  });
};

export const toggleExpenseType1 = (id, status) => {
  return API.put(`/master/toggleExpenseMasterType/${id}`, {
    is_active: status,
  });
};

export const updateExpenseType1 = (id, data) => {
  return API.put(`/master/updateExpenseMasterType/${id}`, data, {
    headers: { "Content-Type": "application/json" },
  });
};

export const updateExpenseTypeStatus = (id, status) => {
  return API.put(
    `/master/updateExpenseMasterTypeStatus/${id}`,
    { status },
    {
      headers: { "Content-Type": "application/json" },
    },
  );
};

// ✅ DELETE
export const deleteExpenseType1 = (id) => {
  return API.delete(`/master/deleteExpenseMasterType/${id}`);
};

// GET ALL EXPENSES
export const getExpenses = () => {
  return API.get(`/expense`);
};

// GET EXPENSE BY ID
export const getExpenseById = (id) => {
  return API.get(`/expense/${id}`);
};

// CREATE EXPENSE (WITH DOCUMENT)
export const createExpense = (formData) => {
  return API.post("/expense", formData); // ✅ NO HEADERS
};

export const getNextExpenseVoucher = () => {
  return API.get(`/expense/next-voucher`);
};

// UPDATE EXPENSE
export const updateExpense = (id, data) => {
  return API.put(`/expense/${id}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// DELETE EXPENSE
export const deleteExpense = (id) => {
  return API.delete(`/expense/${id}`);
};

export const getExpenseMasters = () => API.get("/expense-master");
export const createExpenseMaster = (data) => API.post("/expense-master", data);
export const updateExpenseMaster = (id, data) =>
  API.put(`/expense-master/${id}`, data);
export const deleteExpenseMaster = (id) => API.delete(`/expense-master/${id}`);
export const toggleExpenseMasterStatus = (id) =>
  API.patch(`/expense-master/${id}/status`);

// ================= EXPENSE TYPE APIs =================

export const getExpenseTypes = () => {
  return API.get("/expense-type");
};

export const getExpenseTypesByMaster = (masterId) => {
  return API.get(`/expense-type/by-master/${masterId}`);
};
export const createExpenseType = (data) => {
  return API.post("/expense-type", data);
};
export const updateExpenseType = (id, data) => {
  return API.put(`/expense-type/${id}`, data);
};

export const toggleExpenseType = (id) => {
  return API.patch(`/expense-type/${id}/status`);
};

export const deleteExpenseType = (id) => {
  return API.delete(`/expense-type/${id}`);
};

//Department apis
/* 🔹 Create Department */
export const createDepartment = (data) => {
  return API.post("/departments", data);
};

/* 🔹 Get All Departments */
export const getDepartments = () => {
  return API.get("/departments");
};
export const getActiveDepartments = () => {
  return API.get("/departments/active");
};

/* 🔹 Get Single Department (Edit) */
export const getDepartmentById = (id) => {
  return API.get(`/departments/${id}`);
};

/* 🔹 Update Department */
export const updateDepartment = (id, data) => {
  return API.put(`/departments/${id}`, data);
};

/* 🔹 Toggle Status */
export const toggleDepartmentStatus = (id) => {
  return API.patch(`/departments/${id}/status`);
};
// Designations (department wise)
export const getDesignationsByDepartment = (department_id) =>
  API.get(`/designations/by-department/${department_id}`);


export const createDesignation = (data) => API.post("/designations", data);
export const getDesignations = () => API.get("/designations");
export const getActiveDesignations = () => API.get("/designations/active");
export const getDesignationById = (id) => API.get(`/designations/${id}`);
export const updateDesignation = (id, data) =>
  API.put(`/designations/${id}`, data);
export const toggleDesignationStatus = (id) =>
  API.patch(`/designations/${id}/status`);
export const deleteDesignation = (id) => API.delete(`/designations/${id}`);

/// ================= EMPLOYEE APIs =================

export const getEmployees = () => {
  return API.get("/employees");
};

export const getEmployeeById = (id) => {
  return API.get(`/employees/${id}`);
};

export const createEmployee = (data) => {
  return API.post("/employees", data);
};

export const updateEmployee = (id, data) => {
  return API.put(`/employees/${id}`, data);
};

export const toggleEmployeeStatus = (id) => {
  return API.patch(`/employees/${id}/status`);
};

export const deleteEmployee = (id) => {
  return API.delete(`/employees/${id}`);
};

/* ================= NEW 🔥 ================= */

// 👉 Auto generate employee code
export const getNextEmpCode = () => {
  return API.get("/employees/generate-code");
};
/* ================= FINANCIAL YEAR MASTER ================= */

// CREATE
export const createFinancialYear = (data) => {
  return API.post("/financial-year/create", data, {
    headers: { "Content-Type": "application/json" },
  });
};

// LIST
export const getFinancialYears = () => {
  return API.get("/financial-year/list");
};

// UPDATE
export const updateFinancialYear = (id, data) => {
  return API.put(`/financial-year/update/${id}`, data, {
    headers: { "Content-Type": "application/json" },
  });
};

// TOGGLE ACTIVE / INACTIVE
export const toggleFinancialYearStatus = (id) => {
  return API.put(`/financial-year/toggle-status/${id}`);
};

// SET ONLY ONE ACTIVE FY (OPTIONAL BUT BEST PRACTICE)
export const setActiveFinancialYear = (id) => {
  return API.put(`/financial-year/set-active/${id}`);
};

// SOFT DELETE
export const deleteFinancialYear = (id) => {
  return API.delete(`/financial-year/delete/${id}`);
};

// CREDIT / DEBIT NOTE
export const getNextCDVoucherNo = (companyId) =>
  API.get(`/credit-debit-note/next/voucher-no/${companyId}`);

export const createCDNote = (data) => API.post("/credit-debit-note", data);

export const getCDNotes = (company_id) =>
  API.get("/credit-debit-note", { params: { company_id } });

export const getCDNoteById = (id) => API.get(`/credit-debit-note/${id}`);

export const updateCDNote = (id, data) =>
  API.put(`/credit-debit-note/${id}`, data);

export const deleteCDNote = (id) => API.delete(`/credit-debit-note/${id}`);

//Jurnal voucher

// ➕ Create Journal
export const createJournal = (payload) => {
  return API.post("/journal-voucher/create", payload);
};

export const createThirdPartyJournal = (payload) => {
  return API.post("/journal-voucher/create-third-party", payload);
};

export const updateThirdPartyJournal = (id, payload) => {
  return API.put(`/journal-voucher/update-third-party/${id}`, payload);
};

// ✏️ Update Journal
export const updateJournal = (id, payload) => {
  return API.put(`/journal-voucher/update/${id}`, payload);
};

// ❌ Delete Journal
export const deleteJournal = (id) => {
  return API.delete(`/journal-voucher/delete/${id}`);
};

// 👁️ Get Journal by ID (Edit Form)
export const getJournalById = (id) => {
  return API.get(`/journal-voucher/${id}`);
};

export const getJournalsByCompany = (companyId) =>
  API.get(`/journal-voucher/company/${companyId}`);

// ================= GST REPORT APIs =================

// GSTR-1 (Sales GST Report)
export const getGSTR1 = (params) =>
  API.get("/gstr-report/gstr1", {
    params,
  });

// GSTR-2B (Purchase GST Report)
export const getGSTR2B = (params) =>
  API.get("/gstr-report/gstr2b", {
    params,
  });

// GSTR-3B (GST Summary Report)
export const getGSTR3B = (params) =>
  API.get("/gstr-report/gstr3b", {
    params,
  });

// GSTR-9 (Annual GST Report)
export const getGSTR9 = (params) =>
  API.get("/gstr-report/gstr9", {
    params,
  });

// ===============================
// CREDIT NOTE APIs
// ===============================

// Create Credit Note
export const createCreditNote = (data) => API.post("/credit-note", data);

// Get all Credit Notes (list)
export const getCreditNotes = (params) => API.get("/credit-note", { params });

// Get single Credit Note by number
export const getCreditNoteById = (id) =>
  API.get(`/credit-note/by-no`, { params: { credit_note_no: id } });

// Update Credit Note
export const updateCreditNote = (creditNoteNo, data) =>
  API.put(`/credit-note/by-no`, data, { params: { credit_note_no: creditNoteNo } });

// Delete Credit Note
export const deleteCreditNote = (creditNoteNo) =>
  API.delete(`/credit-note/by-no`, { params: { credit_note_no: creditNoteNo } });

//
export const getNextCreditNoteNo = (companyId) =>
  API.get(`/credit-note/next/${companyId}`);

export const getSaleInvoicesByParty = (party_id) =>
  API.get("/sale/by-party/invoices", {
    params: { party_id },
  });

export const exportCreditNotesJson = (params) => API.get("/credit-note/export-json", { params });

// ===============================
// DEBIT NOTE APIs
// ===============================

// Create Debit Note
export const createDebitNote = (data) => API.post("/debit-note", data);

// Get all Debit Notes (list)
export const getDebitNotes = (params) => API.get("/debit-note", { params });

// Get single Debit Note by number
export const getDebitNoteById = (debitNoteNo, company_id) =>
  API.get(`/debit-note/by-no`, {
    params: { debit_note_no: debitNoteNo, company_id },
  });

// Update Debit Note
export const updateDebitNote = (debitNoteNo, data) =>
  API.put(`/debit-note/by-no`, data, { params: { debit_note_no: debitNoteNo } });

// Delete Debit Note
export const deleteDebitNote = (debitNoteNo, company_id) =>
  API.delete(`/debit-note/by-no`, {
    params: { debit_note_no: debitNoteNo, company_id },
  });

// Get next Debit Note number
export const getNextDebitNoteNo = (companyId) =>
  API.get(`/debit-note/next/${companyId}`);

// Get Purchase Invoices by Party (for Debit Note)
export const getPurchaseInvoicesByParty = (party_id) =>
  API.get("/purchase/by-party/invoices", {
    params: { party_id },
  });

export const exportDebitNotesJson = (params) => API.get("/debit-note/export-json", { params });

// ================= PURCHASE TDS APIs =================

// ➕ Create TDS (optional, usually purchase API me hota hai)
export const createPurchaseTDS = (data) => API.post("/purchase-tds", data);

// 📄 Get TDS by Purchase Bill ID
export const getPurchaseTDS = (purchase_bill_id) =>
  API.get(`/purchase-tds/${purchase_bill_id}`);

// ✏️ Update TDS
export const updatePurchaseTDS = (id, data) =>
  API.put(`/purchase-tds/${id}`, data);

// ❌ Delete TDS
export const deletePurchaseTDS = (id) => API.delete(`/purchase-tds/${id}`);

export const createPrefix = (data) => API.post("/prefix/create", data);

export const getPrefixes = (company_id) =>
  API.get(`/prefix/list?company_id=${company_id}`);

export const updatePrefix = (id, data) => API.put(`/prefix/update/${id}`, data);

export const deletePrefix = (id) => API.delete(`/prefix/delete/${id}`);

export const generateVoucherNumber = (data) =>
  API.post("/prefix/generate-number", data);

export const togglePrefixStatus = (id) =>
  API.patch(`/prefix/toggle-status/${id}`);

// export const getBanks = (company_id) =>
//   API.get("/bank", {
//     params: { company_id },
//   });

// ================= BANK APIs =================

// GET
export const getBanks = (company_id) =>
  API.get("/bank", {
    params: { company_id },
  });

// DELETE
export const deleteBank = (id) =>
  API.delete(`/bank/${id}`);

// STATUS UPDATE
export const updateBankStatus = (id, data) =>
  API.put(`/bank/status/${id}`, data);

// ADD / UPDATE (future use)
export const saveBank = (data) =>
  API.post("/bank", data);

/* ================= OPENING BALANCE APIs ================= */
export const createOpeningBalance = (data) =>
  API.post("/opening-balance", data);

// Get All Opening Balances
export const getOpeningBalances = (company_id) =>
  API.get("/opening-balance", {
    params: { company_id },
  });

// Get Single Opening Balance
export const getOpeningBalanceById = (id) => API.get(`/opening-balance/${id}`);

// Update Opening Balance
export const updateOpeningBalance = (id, data) =>
  API.put(`/opening-balance/${id}`, data);

// Delete Opening Balance
export const deleteOpeningBalance = (id, company_id) =>
  API.delete(`/opening-balance/${id}`, {
    params: { company_id },
  });

/* ==============================
   CONTRA VOUCHER APIs
============================== */
// Create Cashbook Entry
export const createContra = (data) => API.post("/contra", data);

// // Get All

export const getContras = (params) => API.get("/contra", { params });

// // Get Single

export const getSingleContra = (id) => API.get(`/contra/${id}`);

export const getContraByVoucher = (contra_no) =>
  API.get(`/contra/voucher/by-no`, { params: { contra_no } });

export const updateContra = (contra_no, data) =>
  API.put(`/contra/voucher/by-no`, data, { params: { contra_no } });

// // Delete

export const deleteContra = (contra_no) => API.delete(`/contra/voucher/by-no`, { params: { contra_no } });

export const getNextContraNumber = () => API.get("/contra/next-number");

/* ================= CASH REPORT ================= */
export const getCashReport = (params = {}) => {
  return API.get("/cash-report", { params });
};

/* ================= BANK REPORT ================= */
export const getBankReport = (params = {}) => {
  return API.get("/bank-report", { params });
};

export const getSaleReport = (params) =>
  API.get("/reports/sale-report", { params });

export const getPurchaseReport = (params) =>
  API.get("/reports/purchase-report", { params });

/* CREATE TAX DUTY */
export const createTaxDuty = (data) => API.post("/tax-duties/create", data);

/* LIST TAX DUTIES */
export const getTaxDuties = (company_id) =>
  API.get(`/tax-duties/list?company_id=${company_id}`);

/* GET SINGLE TAX DUTY */
export const getTaxDutyById = (id) => API.get(`/tax-duties/${id}`);

/* UPDATE TAX DUTY */
export const updateTaxDuty = (id, data) =>
  API.put(`/tax-duties/update/${id}`, data);

/* DELETE TAX DUTY */
export const deleteTaxDuty = (id) => API.delete(`/tax-duties/delete/${id}`);

/* GET DUTIES & TAX GROUP */
export const getDutiesGroups = (company_id) =>
  API.get(`/tax-duties/groups/duties?company_id=${company_id}`);

export const getTdsInvoicesByParty = (company_id, party_id) =>
  API.get("/tax-duties/tds/by-party", {
    params: { company_id, party_id },
  });

export const getTdsReport = (companyId, fromDate, toDate) =>
  API.get(`/reports/tds`, {
    params: { company_id: companyId, fromDate, toDate },
  });

export const getVoucherReport = (params) => {
  return API.get("/voucher/report", { params });
};

/* ===============================
CREDIT NOTE REPORT
=============================== */

export const getCreditNoteReport = (params) => {
  return API.get("/credit-note/report", { params });
};

/* ===============================
DEBIT NOTE REPORT
=============================== */

export const getDebitNoteReport = (params) => {
  return API.get("/debit-note/report", { params });
};

/* ===============================
Contra REPORT
=============================== */

export const getContraReport = (params) => {
  return API.get("/contra/report", { params });
};

/* ===============================
GST MASTER LIST
=============================== */

export const getGstList = (params) => {
  return API.get("/gst-master/gst-list", { params });
};

/* ===============================
ADD GST
=============================== */

export const addGst = (data) => {
  return API.post("/gst-master/add-gst", data);
};

/* ===============================
GET GST BY ID
=============================== */

export const getGstById = (id) => {
  return API.get(`/gst-master/gst/${id}`);
};

/* ===============================
UPDATE GST
=============================== */

export const updateGst = (id, data) => {
  return API.put(`/gst-master/update-gst/${id}`, data);
};

/* ===============================
DELETE GST
=============================== */

export const deleteGst = (id) => {
  return API.delete(`/gst-master/delete-gst/${id}`);
};

export const toggleGstStatus = (id) => {
  return API.put(`/gst-master/toggle-gst/${id}`);
};

/* ===============================
ADD SHIFT
=============================== */

export const addShift = (data) => {
  return API.post("/shift", data);
};

/* ===============================
GET ALL SHIFTS
=============================== */

export const getShifts = () => {
  return API.get("/shift");
};

/* ===============================
GET SHIFT BY ID
=============================== */

export const getShiftById = (id) => {
  return API.get(`/shift/${id}`);
};

/* ===============================
UPDATE SHIFT
=============================== */

export const updateShift = (id, data) => {
  return API.put(`/shift/${id}`, data);
};

/* ===============================
DELETE SHIFT
=============================== */

export const deleteShift = (id) => {
  return API.delete(`/shift/${id}`);
};



export const toggleShiftStatus = (id, status) => {
  return API.patch(`/shift/status/${id}`, { status });
};

/* ================= PAYROLL APIs ================= */

// Generate Salary
export const generateSalary = (data) => {
  return API.post("/salarygenerate/generate", data);
};

// Get Payroll (month wise)
export const getPayroll = (month) => {
  return API.get(`/salarygenerate?month=${month}`);
};
//
export const createSalaryPayment = (data) => {
  return API.post("/salarypay", data);
};

export const getSalaryPayments = (month) => {
  return API.get(`/salarypay/payments`, {
    params: { month },
  });
};

export default API;
