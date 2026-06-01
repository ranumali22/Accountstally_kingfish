// import { useEffect, useMemo, useState, useContext } from "react";
// import { Eye, Pencil, Printer, Trash2, Download, Search, FileUp, FileJson } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import { getCompanyProfile, getSales, deleteSale, searchParty, createParty, createSale, bulkCreateSale, fetchItems, createItem, getAllTax, exportTallyJson } from "../../../api";
// import axios from "axios";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import { LoaderContext } from "../../../context/LoaderContext";
// import html2pdf from "html2pdf.js";
// import { showError, showSuccess } from "../../../components/ui/alert/Alert";
// import * as XLSX from "xlsx";
// import { formatDate as formatDateDDMMYYYY, toYYYYMMDD as toLocalYYYYMMDD } from "../../../utils/dateUtils";

// const API_BASE = import.meta.env.VITE_SERVER_URL;

// export default function BulkSale() {
//   const navigate = useNavigate();
//   const { setLoading } = useContext(LoaderContext);

//   // toLocalYYYYMMDD is now imported from central utility
//   // Note: the imported version is slightly different but should handle standard JS dates.
//   // We will keep a local version if special Excel serial number handling is needed,
//   // but for standard display we use the utility.

//   const today = new Date();
//   const firstDay = toLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth(), 1));
//   const lastDay = toLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

//   const [bills, setBills] = useState([]);
//   const [loading, setLocalLoading] = useState(false);
//   const [search, setSearch] = useState("");
//   const [searchInput, setSearchInput] = useState("");
//   const [fromDate, setFromDate] = useState(firstDay);
//   const [toDate, setToDate] = useState(lastDay);
//   const [company, setCompany] = useState(null);
//   const [taxList, setTaxList] = useState([]);

//   // Pagination states
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
//   const [selectedIds, setSelectedIds] = useState([]);

//   const money = (v) => Number(v || 0);

//   useEffect(() => {
//     const timer = setTimeout(() => setSearch(searchInput), 400);
//     return () => clearTimeout(timer);
//   }, [searchInput]);

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await getCompanyProfile();
//         setCompany(res.data.data || null);
//         const taxRes = await getAllTax();
//         setTaxList(taxRes.data?.data || []);
//       } catch (err) {
//         console.error("Fetch failed", err);
//       }
//     })();
//   }, []);

//   const loadSales = async () => {
//     try {
//       setLocalLoading(true);
//       const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
//       const companyId = companyData.id;

//       const res = await getSales({ company_id: companyId, fromDate, toDate, search });
//       const rows = res.data.data || [];
//       const mapped = rows.map((b) => ({
//         id: b.id,
//         party: b.party,
//         partyName: b.party,
//         party_gstin: b.party_gstin,
//         party_address: b.party_address,
//         party_email: b.party_email,
//         party_mobile: b.party_mobile,
//         invoiceNo: b.invoice_no,
//         date: b.voucher_date,
//         mode: b.mode,
//         paid: Number(b.paid_amount),
//         due: Number(b.due_amount),
//         grandTotal: Number(b.total_amount),
//         rows: b.rows || [],
//       }));
//       setBills(mapped);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLocalLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadSales();
//   }, [fromDate, toDate, search]);

//   const filteredBills = useMemo(() => {
//     return bills.filter((b) => {
//       const s = search.toLowerCase();
//       return (
//         String(b.invoiceNo || "").toLowerCase().includes(s) ||
//         String(b.partyName || "").toLowerCase().includes(s)
//       );
//     });
//   }, [bills, search]);

//   const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage);

//   const totalAmount = filteredBills.reduce((sum, b) => sum + money(b.grandTotal), 0);
//   const totalPaid = filteredBills.reduce((sum, b) => sum + money(b.paid), 0);
//   const totalBalance = filteredBills.reduce((sum, b) => sum + money(b.due), 0);

//   const handleImportExcel = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setLoading(true);
//     const reader = new FileReader();
//     reader.onload = async (evt) => {
//       try {
//         const bstr = evt.target.result;
//         const wb = XLSX.read(bstr, { type: "binary" });
//         const wsname = wb.SheetNames[0];
//         const ws = wb.Sheets[wsname];
//         const rawData = XLSX.utils.sheet_to_json(ws, { cellDates: true });
//         if (!rawData.length) {
//           showError("Excel sheet is empty");
//           setLoading(false);
//           return;
//         }

//         // Normalize keys to lowercase for flexibility
//         const data = rawData.map(row => {
//           const newRow = {};
//           Object.keys(row).forEach(k => {
//             newRow[k.toLowerCase().trim().replace(/\s+/g, "")] = row[k];
//           });
//           return newRow;
//         });

//         const getVal = (row, ...keys) => {
//           for (const k of keys) {
//             const normalizedK = k.toLowerCase().trim().replace(/\s+/g, "");
//             if (row[normalizedK] !== undefined) return row[normalizedK];
//           }
//           return undefined;
//         };

//         // Group rows
//         const groups = {};
//         data.forEach((row) => {
//           const pName = getVal(row, "partyname", "party", "name", "customername", "companyname", "clientname");
//           let pDate = getVal(row, "date", "voucherdate", "invoicedate", "billdate", "date", "invoicedate");

//           if (!pDate) {
//             for (const k in row) {
//               const val = row[k];
//               if (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val.getTime())) {
//                 pDate = val;
//                 break;
//               }
//               if (typeof val === "string" && val.match(/^\d{1,4}[/-]\d{1,4}[/-]\d{1,4}$/)) {
//                 pDate = val;
//                 break;
//               }
//               // Add Numeric (Excel Serial) check
//               if (typeof val === "number" && val > 10000 && val < 100000) {
//                 pDate = val;
//                 break;
//               }
//             }
//           }

//           if (!pName) return; 

//           const dateStr = pDate ? toLocalYYYYMMDD(pDate) : "no-date";
//           const key = `${dateStr}_${pName}_${invoiceNo}`;
//           if (!groups[key]) groups[key] = [];
//           groups[key].push(row);
//         });

//         const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
//         const companyId = companyData.id;

//         const allBills = [];

//         for (const key in groups) {
//           const groupRows = groups[key];
//           const first = groupRows[0];

//           // 1. Find or Create Party
//           let partyId = null;
//           const searchName = (getVal(first, "partyname", "party", "name", "customername", "companyname", "clientname") || "").toString().trim();
//           if (!searchName) continue;

//           try {
//             const gstin = (getVal(first, "partygstin", "gstin", "gst", "gstnumber") || "").toString().trim().toUpperCase();

//             // Try searching by GST first if available, otherwise by name
//             const partySearchRes = await searchParty({ 
//               q: gstin || searchName, 
//               company_id: companyId 
//             });

//             // Improved matching: trim and lowercase everything
//             const match = (partySearchRes.data || []).find(p => {
//               const dbName = (p.company_name || "").toLowerCase().trim();
//               const excelName = searchName.toLowerCase().trim();
//               const dbGst = (p.gst_number || "").toUpperCase().trim();

//               if (gstin && dbGst === gstin) return true;
//               return dbName === excelName;
//             });

//             if (match) {
//               partyId = match.id;
//             } else {
//               const partyPayload = {
//                 company_id: companyId,
//                 company_name: searchName,
//               };

//               const mobile = getVal(first, "partymobile", "mobile", "phone", "contact", "mobilenumber", "contactnumber");
//               const gstin = getVal(first, "partygstin", "gstin", "gst", "gstnumber", "partygst");
//               const address = getVal(first, "partyaddress", "address", "location", "partyaddress");
//               const state = getVal(first, "partystate", "state", "customerstate", "partystate");
//               const city = getVal(first, "partycity", "city", "town", "partycity", "location");
//               const pincode = getVal(first, "partypincode", "pincode", "pin", "zip", "partypincode");
//               const stateCode = getVal(first, "statecode", "state_code", "st_code");

//               if (mobile) partyPayload.mobile_number = String(mobile).trim();
//               if (gstin && gstin.toString().trim() !== "") {
//                 const cleanGst = String(gstin).trim().toUpperCase();
//                 partyPayload.gst_number = cleanGst;
//                 partyPayload.gst_type = "gst";
//               } else {
//                 partyPayload.gst_type = "not_gst";
//               }
//               if (address) partyPayload.address = String(address).trim();
//               if (state) partyPayload.state = String(state).trim();
//               if (city) partyPayload.city = String(city).trim();
//               if (pincode) partyPayload.pincode = String(pincode).trim();
//               if (stateCode) partyPayload.state_code = String(stateCode).trim();

//               try {
//                 const newPartyRes = await createParty(partyPayload);
//                 partyId = newPartyRes.data.id;
//               } catch (pErr) {
//                 // If 409 Conflict (Duplicate), it means party exists. Try searching again or showing more specific error.
//                 if (pErr.response?.status === 409 || (pErr.response?.data?.error || "").includes("exists")) {
//                   // ✅ Use ID from 409 response if available
//                   if (pErr.response?.data?.id) {
//                     partyId = pErr.response.data.id;
//                   } else {
//                     // Fallback to search
//                     const retrySearch = await searchParty({ 
//                       q: gstin || searchName, 
//                       company_id: companyId 
//                     });

//                     const retryMatch = (retrySearch.data || []).find(p => {
//                       const dbName = (p.company_name || "").toLowerCase().trim();
//                       const excelName = searchName.toLowerCase().trim();
//                       const dbGst = (p.gst_number || "").toUpperCase().trim();

//                       if (gstin && dbGst === gstin) return true;
//                       return dbName === excelName;
//                     });

//                     if (retryMatch) {
//                       partyId = retryMatch.id;
//                     } else {
//                       showError(`Party "${searchName}" exists but could not be retrieved. Please check its status.`);
//                       continue;
//                     }
//                   }
//                 } else {
//                   const errMsg = pErr.response?.data?.error || pErr.response?.data?.message || "Failed to create party";
//                   showError(`Party "${searchName}": ${errMsg}`);
//                   continue;
//                 }
//               }
//             }
//           } catch (err) {
//             console.error("Party processing error", err);
//             continue;
//           }

//           // 2. Prepare Sale Payload
//           const saleItems = [];
//           let totalSaleAmount = 0;

//           for (const r of groupRows) {
//             const qty = money(getVal(r, "qty", "quantity") || 1);
//             let price = money(getVal(r, "price", "rate"));
//             let taxPercent = money(getVal(r, "taxpercent", "tax", "gstpercent", "taxrate"));
//             const subTotal = money(getVal(r, "subtotal", "taxableamount", "baseamount", "taxable"));
//             const igstAmt = money(getVal(r, "igst", "igstamount", "igstamt"));
//             const cgstAmt = money(getVal(r, "cgst", "cgstamount", "cgstamt"));
//             const sgstAmt = money(getVal(r, "sgst", "sgstamount", "sgstamt"));
//             const rowTotal = money(getVal(r, "amount", "total", "grandtotal"));

//             if (!taxPercent && subTotal > 0) {
//               taxPercent = Math.round(((igstAmt + cgstAmt + sgstAmt) / subTotal) * 100);
//             }

//             const itemName = getVal(r, "itemname", "item", "description", "particulars", "productname", "service")?.toString().trim();
//             const hsn = getVal(r, "hsn", "hsncode", "sac", "saccode")?.toString().trim() || null;

//             // PRIORITY: Use Excel values directly
//             const finalPrice = subTotal || price || (rowTotal - (igstAmt + cgstAmt + sgstAmt));
//             const finalTaxAmount = (igstAmt + cgstAmt + sgstAmt);
//             const finalAmount = rowTotal || (finalPrice + finalTaxAmount);

//             const finalTaxPercent = taxPercent || 18;
//             const finalItemName = itemName || "General Sale";

//             saleItems.push({
//               item_name: finalItemName,
//               hsn: hsn,
//               qty: qty,
//               price_per_unit: finalPrice / qty,
//               tax_percent: finalTaxPercent,
//               igst_amount: igstAmt,
//               cgst_amount: cgstAmt,
//               sgst_amount: sgstAmt,
//               tax_amount: finalTaxAmount,
//               amount: finalAmount,
//               row_type: (getVal(first, "mode", "type") || "SERVICE").toUpperCase(),
//               price_type: "WITHOUT_TAX",
//               unit_id: null,
//               tax_id: null
//             });
//             totalSaleAmount += finalAmount;
//           }

//           if (!saleItems.length) continue;

//           let pDate = getVal(first, "date", "voucherdate", "invoicedate", "billdate", "date");

//           if (!pDate) {
//             for (const k in first) {
//               const val = first[k];
//               if (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val.getTime())) {
//                 pDate = val;
//                 break;
//               }
//               if (typeof val === "string" && val.match(/^\d{1,4}[/-]\d{1,4}[/-]\d{1,4}$/)) {
//                 pDate = val;
//                 break;
//               }
//               // Add Numeric (Excel Serial) check
//               if (typeof val === "number" && val > 10000 && val < 100000) {
//                 pDate = val;
//                 break;
//               }
//             }
//           }

//           // Guaranteed Fallback: Extract from key if still missing
//           if (!pDate) {
//             const [kDate] = key.split("_");
//             if (kDate !== "no-date") pDate = kDate;
//           }
//           const pType = getVal(first, "paymenttype", "payment", "paymentmode", "mode", "paymentstatus");
//           const paid = getVal(first, "paidamount", "paid", "amountpaid", "paid");
//           const narration = getVal(first, "narration", "remarks", "note", "description", "remarks");
//           const invoiceNo = getVal(first, "invoiceno", "billno", "invoice_no", "invoicenumber", "billnumber");

//           // Multi-branch Company Details
//           const compName = getVal(first, "company_name", "companyname", "billing_name");
//           const compGst = getVal(first, "company_gst_no", "company_gst", "companygst", "billing_gst");
//           const compAddr = getVal(first, "company_address", "company_addr", "billing_address");
//           const compPin = getVal(first, "company_pincode", "company_pin", "billing_pincode");
//           const compCity = getVal(first, "company_city", "billing_city");
//           const compState = getVal(first, "company_state", "billing_state");
//           const compContact = getVal(first, "company_contact_no", "company_phone", "billing_phone", "company_contact");
//           const compEmail = getVal(first, "company_email", "billing_email");
//           const compPan = getVal(first, "company_pan_number", "company_pan", "billing_pan");

//           const voucherDate = pDate ? toLocalYYYYMMDD(pDate) : toLocalYYYYMMDD(new Date());

//           allBills.push({
//             invoice_no: invoiceNo ? String(invoiceNo).trim() : undefined,
//             voucher_date: voucherDate,
//             mode: (getVal(first, "mode", "type", "billtype") || "SERVICE").toUpperCase(),
//             party_id: partyId,
//             narration: narration || "Bulk Excel Upload",
//             total_amount: Math.round(totalSaleAmount * 100) / 100,
//             payment_type: (pType || "NONE").toUpperCase(),
//             paid_amount: Math.round(money(paid) * 100) / 100,
//             due_amount: Math.round((totalSaleAmount - money(paid)) * 100) / 100,
//             rows: saleItems,
//             // Branch details
//             company_name: compName,
//             company_gst_no: compGst,
//             company_address: compAddr,
//             company_pincode: compPin,
//             company_city: compCity,
//             company_state: compState,
//             company_contact_no: compContact,
//             company_email: compEmail,
//             company_pan_number: compPan
//           });
//         }

//         if (allBills.length > 0) {
//           // Final Validation: Ensure every bill has a valid date
//           const missingDate = allBills.find(b => !b.voucher_date || b.voucher_date === "");
//           if (missingDate) {
//             showError(`Import aborted: Some bills are missing a valid date. Please check your Excel column headers.`);
//             setLoading(false);
//             return;
//           }

//           try {
//             const res = await bulkCreateSale({ company_id: companyId, bills: allBills });
//             const results = res.data.results || [];
//             const skipped = results.filter(r => r.status === "skipped") || [];
//             const successCount = results.filter(r => r.status === "success").length;

//             if (successCount > 0) {
//               showSuccess(`Successfully imported ${successCount} invoices.`);
//             }

//             if (skipped.length > 0) {
//               showError(`${skipped.length} invoices skipped as they already exist (Duplicate Invoice No).`);
//             }

//             setLoading(false);
//             loadSales();
//           } catch (apiErr) {
//             const msg = apiErr.response?.data?.error || "Bulk import failed";
//             showError(msg);
//             setLoading(false);
//           }
//         } else {
//           setLoading(false);
//         }
//       } catch (err) {
//         console.error("Import failed", err);
//         showError("Failed to import Excel data");
//       } finally {
//         setLoading(false);
//       }
//     };
//     reader.readAsBinaryString(file);
//     e.target.value = null;
//   };

//   const toggleSelectAll = (e) => {
//     if (e.target.checked) {
//       setSelectedIds(paginatedBills.map(b => b.id));
//     } else {
//       setSelectedIds([]);
//     }
//   };

//   const toggleSelectOne = (id) => {
//     setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
//   };

//   const exportSelectedToJson = async () => {
//     if (!selectedIds.length) {
//       showError("Please select at least one bill to export");
//       return;
//     }
//     try {
//       setLoading(true);
//       const res = await exportTallyJson(selectedIds.join(","));
//       const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
//       const downloadAnchorNode = document.createElement('a');
//       const companyName = company?.name || "Bulk";
//       const safeCompanyName = companyName.replace(/[/\\?%*:|"<>]/g, '-');
//       const today = new Date();
//       const formattedDate = today.toLocaleDateString('en-GB').replace(/\//g, '-');
//       downloadAnchorNode.setAttribute("download", `${safeCompanyName}_Bulk_Export_${formattedDate}.json`);
//       document.body.appendChild(downloadAnchorNode);
//       downloadAnchorNode.click();
//       downloadAnchorNode.remove();
//       showSuccess("Tally JSON exported successfully");
//     } catch (err) {
//       showError("Failed to export Tally JSON");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const downloadSingleJson = async (bill) => {
//     setLoading(true);
//     try {
//       const res = await exportTallyJson(bill.id);
//       const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
//       const downloadAnchorNode = document.createElement('a');
//       downloadAnchorNode.setAttribute("href", dataStr);

//       // Clean party name for filename
//       const safePartyName = (bill.party || "Sale").replace(/[/\\?%*:|"<>]/g, '-');
//       const safeInvoice = (bill.invoiceNo || "").replace(/[/\\?%*:|"<>]/g, '_');

//       downloadAnchorNode.setAttribute("download", `${safePartyName}_${safeInvoice}.json`);
//       document.body.appendChild(downloadAnchorNode);
//       downloadAnchorNode.click();
//       downloadAnchorNode.remove();
//     } catch (err) {
//       showError("Failed to download Tally JSON");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // formatDateDDMMYYYY is now imported from central utility

//   const deleteBill = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this invoice?")) return;
//     try {
//       await deleteSale(id);
//       setBills((prev) => prev.filter((b) => b.id !== id));
//       showSuccess("Deleted successfully");
//     } catch (err) {
//       showError("Delete failed");
//     }
//   };

//   return (
//     <div className="w-full min-h-screen bg-gray-100">
//       <div className="max-w-7xl mx-auto p-4 space-y-4">
//         <div className="bg-white border-b px-5 py-3 flex items-center justify-between rounded-xl shadow-sm">
//           <div className="text-lg font-semibold text-gray-800">Bulk Sales Management</div>
//           <div className="flex gap-3">
//             <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer transition-all">
//               <FileUp size={18} />
//               Import Excel
//               <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImportExcel} />
//             </label>
//             <button
//               onClick={exportSelectedToJson}
//               disabled={selectedIds.length === 0}
//               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedIds.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
//             >
//               <FileJson size={18} />
//               Export Selected ({selectedIds.length})
//             </button>
//           </div>
//         </div>

//         {/* Summary Cards */}
//         <div className="bg-white border rounded-xl p-5 shadow-sm">
//           <div className="flex flex-wrap items-center gap-3">
//             <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-green-50 border">
//               <div className="text-xs text-gray-500 uppercase tracking-wide">Paid</div>
//               <div className="text-lg font-semibold text-green-700">₹ {totalPaid.toFixed(2)}</div>
//             </div>
//             <div className="text-lg font-semibold text-gray-400">+</div>
//             <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-blue-50 border">
//               <div className="text-xs text-gray-500 uppercase tracking-wide">Unpaid</div>
//               <div className="text-lg font-semibold text-blue-700">₹ {totalBalance.toFixed(2)}</div>
//             </div>
//             <div className="text-lg font-semibold text-gray-400">=</div>
//             <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-orange-50 border">
//               <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
//               <div className="text-lg font-semibold text-orange-600">₹ {totalAmount.toFixed(2)}</div>
//             </div>
//           </div>

//           {/* Date Filters */}
//           <div className="mt-5 flex flex-wrap items-center gap-3">
//             <div className="flex items-center gap-2">
//               <span className="px-3 py-2 bg-gray-100 rounded-md text-sm">Between</span>
//               <DatePicker
//                 selected={fromDate ? new Date(fromDate) : null}
//                 onChange={(date) => setFromDate(toLocalYYYYMMDD(date))}
//                 dateFormat="dd-MM-yyyy"
//                 className="h-10 border rounded-md px-3 text-sm w-[150px] outline-none focus:ring-2 focus:ring-[#22A586]"
//               />
//               <span className="text-sm text-gray-500">To</span>
//               <DatePicker
//                 selected={toDate ? new Date(toDate) : null}
//                 onChange={(date) => setToDate(toLocalYYYYMMDD(date))}
//                 dateFormat="dd-MM-yyyy"
//                 className="h-10 border rounded-md px-3 text-sm w-[150px] outline-none focus:ring-2 focus:ring-[#22A586]"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
//           <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b">
//             <div className="flex items-center gap-3">
//               <h2 className="text-lg font-semibold text-gray-800">All Bulk Bills</h2>
//               <span className="px-3 py-1 text-xs rounded-full bg-red-500 text-white font-semibold">
//                 {filteredBills.length} Records
//               </span>
//             </div>
//             <div className="relative w-full sm:w-[280px]">
//               <Search size={18} className="absolute left-3 top-[10px] text-gray-400" />
//               <input
//                 value={searchInput}
//                 onChange={(e) => setSearchInput(e.target.value)}
//                 placeholder="Search Invoice or Party..."
//                 className="h-[38px] w-full border rounded-lg pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500"
//               />
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="bg-gray-800 text-white text-left uppercase text-[11px] tracking-wider">
//                 <tr>
//                   <th className="p-4 text-center w-12">
//                     <input 
//                       type="checkbox" 
//                       onChange={toggleSelectAll}
//                       checked={paginatedBills.length > 0 && selectedIds.length === paginatedBills.length}
//                     />
//                   </th>
//                   <th className="p-4 text-center w-12">Sr</th>
//                   <th className="p-4 min-w-[150px]">Party</th>
//                   <th className="p-4 w-[150px]">Invoice No</th>
//                   <th className="p-4 w-[120px]">Date</th>
//                   <th className="p-4 w-[100px]">Mode</th>
//                   <th className="p-4 text-right w-[130px]">Total</th>
//                   <th className="p-4 text-right w-[130px]">Paid</th>
//                   <th className="p-4 text-right w-[130px]">Due</th>
//                   <th className="p-4 text-center w-[200px]">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {loading ? (
//                   <tr><td colSpan={10} className="py-20 text-center text-gray-400">Loading data...</td></tr>
//                 ) : paginatedBills.length === 0 ? (
//                   <tr><td colSpan={10} className="py-20 text-center text-gray-400">No records found</td></tr>
//                 ) : (
//                   paginatedBills.map((b, idx) => (
//                     <tr key={b.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(b.id) ? 'bg-indigo-50/30' : ''}`}>
//                       <td className="p-4 text-center">
//                         <input 
//                           type="checkbox" 
//                           checked={selectedIds.includes(b.id)}
//                           onChange={() => toggleSelectOne(b.id)}
//                         />
//                       </td>
//                       <td className="p-4 text-center border-r">{startIndex + idx + 1}</td>
//                       <td className="p-4 font-medium">{b.party}</td>
//                       <td className="p-4 text-indigo-600 font-semibold">{b.invoiceNo}</td>
//                       <td className="p-4 text-gray-600">{formatDateDDMMYYYY(b.date)}</td>
//                       <td className="p-4"><span className="px-2 py-1 rounded-md bg-gray-100 text-[10px] font-bold">{b.mode}</span></td>
//                       <td className="p-4 text-right font-semibold">₹ {b.grandTotal.toFixed(2)}</td>
//                       <td className="p-4 text-right text-green-600">₹ {b.paid.toFixed(2)}</td>
//                       <td className="p-4 text-right text-red-600">₹ {b.due.toFixed(2)}</td>
//                       <td className="p-4">
//                         <div className="flex items-center justify-center gap-2">
//                           <button onClick={() => downloadSingleJson(b)} className="p-2 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100" title="Download JSON">
//                             <FileJson size={18} />
//                           </button>
//                           <button onClick={() => deleteBill(b.id)} className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100" title="Delete">
//                             <Trash2 size={18} />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//           {totalPages > 1 && (
//             <div className="p-4 border-t flex items-center justify-between bg-gray-50">
//               <div className="text-sm text-gray-600">
//                 Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(startIndex + itemsPerPage, filteredBills.length)}</span> of <span className="font-semibold">{filteredBills.length}</span> entries
//               </div>
//               <div className="flex gap-1">
//                 <button
//                   disabled={currentPage === 1}
//                   onClick={() => setCurrentPage(prev => prev - 1)}
//                   className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Previous
//                 </button>
//                 {[...Array(totalPages)].map((_, i) => (
//                   <button
//                     key={i + 1}
//                     onClick={() => setCurrentPage(i + 1)}
//                     className={`px-3 py-1 border rounded-md text-sm ${currentPage === i + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50'}`}
//                   >
//                     {i + 1}
//                   </button>
//                 ))}
//                 <button
//                   disabled={currentPage === totalPages}
//                   onClick={() => setCurrentPage(prev => prev + 1)}
//                   className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Next
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



import { useEffect, useMemo, useState, useContext } from "react";
import { Eye, Pencil, Printer, Trash2, Download, Search, FileUp, FileJson } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCompanyProfile, getSales, deleteSale, searchParty, createParty, createSale, bulkCreateSale, fetchItems, createItem, getAllTax, exportTallyJson } from "../../../api";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { LoaderContext } from "../../../context/LoaderContext";
import html2pdf from "html2pdf.js";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";
import * as XLSX from "xlsx";
import { formatDate as formatDateDDMMYYYY, toYYYYMMDD as toLocalYYYYMMDD } from "../../../utils/dateUtils";

const API_BASE = import.meta.env.VITE_SERVER_URL;

export default function BulkSale() {
  const navigate = useNavigate();
  const { setLoading } = useContext(LoaderContext);

  // toLocalYYYYMMDD is now imported from central utility
  // Note: the imported version is slightly different but should handle standard JS dates.
  // We will keep a local version if special Excel serial number handling is needed,
  // but for standard display we use the utility.

  const today = new Date();
  const firstDay = toLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = toLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [bills, setBills] = useState([]);
  const [loading, setLocalLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [company, setCompany] = useState(null);
  const [taxList, setTaxList] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState([]);

  const money = (v) => Number(v || 0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCompanyProfile();
        setCompany(res.data.data || null);
        const taxRes = await getAllTax();
        setTaxList(taxRes.data?.data || []);
      } catch (err) {
        console.error("Fetch failed", err);
      }
    })();
  }, []);

  const loadSales = async () => {
    try {
      setLocalLoading(true);
      const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
      const companyId = companyData.id;

      const res = await getSales({ company_id: companyId, fromDate, toDate, search });
      const rows = res.data.data || [];
      const mapped = rows.map((b) => ({
        id: b.id,
        party: b.party,
        partyName: b.party,
        party_gstin: b.party_gstin,
        party_address: b.party_address,
        party_email: b.party_email,
        party_mobile: b.party_mobile,
        invoiceNo: b.invoice_no,
        date: b.voucher_date,
        mode: b.mode,
        paid: Number(b.paid_amount),
        due: Number(b.due_amount),
        grandTotal: Number(b.total_amount),
        rows: b.rows || [],
      }));
      setBills(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [fromDate, toDate, search]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const s = search.toLowerCase();
      return (
        String(b.invoiceNo || "").toLowerCase().includes(s) ||
        String(b.partyName || "").toLowerCase().includes(s)
      );
    });
  }, [bills, search]);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage);

  const totalAmount = filteredBills.reduce((sum, b) => sum + money(b.grandTotal), 0);
  const totalPaid = filteredBills.reduce((sum, b) => sum + money(b.paid), 0);
  const totalBalance = filteredBills.reduce((sum, b) => sum + money(b.due), 0);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });
        if (!rawData.length) {
          showError("Excel sheet is empty");
          setLoading(false);
          return;
        }

        // Normalize keys to lowercase for flexibility
        const data = rawData.map(row => {
          const newRow = {};
          Object.keys(row).forEach(k => {
            newRow[k.toLowerCase().trim().replace(/\s+/g, "")] = row[k];
          });
          return newRow;
        });

        const getVal = (row, ...keys) => {
          for (const k of keys) {
            const normalizedK = k.toLowerCase().trim().replace(/\s+/g, "");
            if (row[normalizedK] !== undefined) return row[normalizedK];
          }
          return undefined;
        };

        // Group rows
        const groups = {};
        data.forEach((row) => {
          const pName = getVal(row, "partyname", "party", "name", "customername", "companyname", "clientname");
          let pDate = getVal(row, "date", "voucherdate", "invoicedate", "billdate", "date", "invoicedate");

          if (!pDate) {
            for (const k in row) {
              const val = row[k];
              if (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val.getTime())) {
                pDate = val;
                break;
              }
              if (typeof val === "string" && val.match(/^\d{1,4}[/-]\d{1,4}[/-]\d{1,4}$/)) {
                pDate = val;
                break;
              }
              // Add Numeric (Excel Serial) check
              if (typeof val === "number" && val > 10000 && val < 100000) {
                pDate = val;
                break;
              }
            }
          }

          if (!pName) return;

          const invoiceNo = getVal(row, "invoiceno", "billno", "invoice_no", "invoicenumber", "billnumber") || "no-invoice";
          const dateStr = pDate ? toLocalYYYYMMDD(pDate) : "no-date";
          const key = `${dateStr}_${pName}_${invoiceNo}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        });

        const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
        const companyId = companyData.id;

        const allBills = [];

        for (const key in groups) {
          const groupRows = groups[key];
          const first = groupRows[0];

          // 1. Find or Create Party
          let partyId = null;
          const searchName = (getVal(first, "partyname", "party", "name", "customername", "companyname", "clientname") || "").toString().trim();
          if (!searchName) continue;

          try {
            const gstin = (getVal(first, "partygstin", "gstin", "gst", "gstnumber") || "").toString().trim().toUpperCase();

            // Try searching by GST first if available, otherwise by name
            const partySearchRes = await searchParty({
              q: gstin || searchName,
              company_id: companyId
            });

            // Improved matching: trim and lowercase everything
            const match = (partySearchRes.data || []).find(p => {
              const dbName = (p.company_name || "").toLowerCase().replace(/\s+/g, "");
              const excelName = searchName.toLowerCase().replace(/\s+/g, "");
              const dbGst = (p.gst_number || "").toUpperCase().trim();

              // Rule: If name matches, it's a match.
              if (dbName === excelName) return true;

              // If name is different, but GST is same, we used to return true.
              // We'll remove that to allow the user to create a new party when name changes.
              // if (gstin && dbGst === gstin) return true; 

              return false;
            });

            if (match) {
              partyId = match.id;
            } else {
              const partyPayload = {
                company_id: companyId,
                company_name: searchName,
              };

              const mobile = getVal(first, "partymobile", "mobile", "phone", "contact", "mobilenumber", "contactnumber", "party_mobile");
              const gstin_val = getVal(first, "partygstin", "gstin", "gst", "gstnumber", "partygst", "gst_no", "gst_number", "party_gst");
              const address = getVal(first, "partyaddress", "address", "location", "partyaddress", "party_address");
              const state = getVal(first, "partystate", "state", "customerstate", "partystate", "party_state", "company_state");
              const city = getVal(first, "partycity", "city", "town", "partycity", "location", "party_city");
              const pincode = getVal(first, "partypincode", "pincode", "pin", "zip", "partypincode", "party_pincode");
              const stateCode = getVal(first, "statecode", "state_code", "st_code", "party_state_code");

              if (mobile) partyPayload.mobile_number = String(mobile).trim();
              if (gstin_val) {
                const cleanGst = String(gstin_val).trim().toUpperCase();
                if (cleanGst && cleanGst !== "") {
                  partyPayload.gst_number = cleanGst;
                  partyPayload.gst_type = "gst";
                } else {
                  partyPayload.gst_type = "not_gst";
                }
              } else {
                partyPayload.gst_type = "not_gst";
              }
              if (address) partyPayload.address = String(address).trim();
              if (state) partyPayload.state = String(state).trim();
              if (city) partyPayload.city = String(city).trim();
              if (pincode) partyPayload.pincode = String(pincode).trim();
              if (stateCode) partyPayload.state_code = String(stateCode).trim();

              try {
                const newPartyRes = await createParty(partyPayload);
                partyId = newPartyRes.data.id;
              } catch (pErr) {
                // If 409 Conflict (Duplicate), use ID from response
                if (pErr.response?.status === 409 || (pErr.response?.data?.error || "").includes("exists")) {
                  if (pErr.response?.data?.id) {
                    partyId = pErr.response.data.id;
                  } else {
                    // Fallback to second search with even looser matching
                    const retrySearch = await searchParty({
                      q: gstin || searchName,
                      company_id: companyId
                    });

                    const retryMatch = (retrySearch.data || []).find(p => {
                      const dbName = (p.company_name || "").toLowerCase().replace(/\s+/g, "");
                      const excelName = searchName.toLowerCase().replace(/\s+/g, "");
                      const dbGst = (p.gst_number || "").toUpperCase().trim();

                      if (gstin && dbGst === gstin) return true;
                      return dbName === excelName || dbName.includes(excelName) || excelName.includes(dbName);
                    });

                    if (retryMatch) {
                      partyId = retryMatch.id;
                    } else {
                      showError(`Party "${searchName}" exists but could not be retrieved. Please check its status.`);
                      continue;
                    }
                  }
                } else {
                  const errMsg = pErr.response?.data?.error || pErr.response?.data?.message || "Failed to create party";
                  showError(`Party "${searchName}": ${errMsg}`);
                  continue;
                }
              }
            }
          } catch (err) {
            console.error("Party processing error", err);
            continue;
          }

          // 2. Prepare Sale Payload
          const saleItems = [];
          let totalSaleAmount = 0;

          const billMode = (getVal(first, "mode", "type") || "SERVICE").toUpperCase();

          for (const r of groupRows) {
            let qty = money(getVal(r, "qty", "quantity") || 1);
            if (billMode === "SERVICE") qty = 1; // Force qty 1 for services to show full subtotal in Amount field

            let taxPercent = money(getVal(r, "taxpercent", "tax", "gstpercent", "taxrate"));
            const subTotal = money(getVal(r, "subtotal", "taxableamount", "baseamount", "taxable"));
            const igstAmt = money(getVal(r, "igst", "igstamount", "igstamt"));
            const cgstAmt = money(getVal(r, "cgst", "cgstamount", "cgstamt"));
            const sgstAmt = money(getVal(r, "sgst", "sgstamount", "sgstamt"));
            const totalRowAmt = money(getVal(r, "amount", "total", "grandtotal"));

            const providedTax = igstAmt + cgstAmt + sgstAmt;

            // source of truth for base amount
            let base = subTotal || (totalRowAmt > 0 ? (totalRowAmt - providedTax) : 0) || (money(getVal(r, "price", "rate")) * qty);

            if (!taxPercent && base > 0) {
              taxPercent = providedTax > 0 ? Math.round((providedTax / base) * 100) : 18;
            }

            const finalTaxPercent = taxPercent || 18;
            const finalTaxAmount = providedTax || (base * finalTaxPercent / 100);
            const finalAmount = totalRowAmt || (base + finalTaxAmount);
            const pricePerUnit = base / qty;

            const itemName = getVal(r, "itemname", "item", "description", "particulars", "productname", "service")?.toString().trim();
            const hsn = getVal(r, "hsn", "hsncode", "sac", "saccode")?.toString().trim() || null;

            saleItems.push({
              item_name: itemName || "Courier Charges As Per Annexure",
              hsn: hsn,
              qty: qty,
              price_per_unit: pricePerUnit,
              tax_percent: finalTaxPercent,
              igst_amount: igstAmt,
              cgst_amount: cgstAmt,
              sgst_amount: sgstAmt,
              tax_amount: finalTaxAmount,
              amount: finalAmount,
              row_type: billMode,
              price_type: "WITHOUT_TAX",
              unit_id: null,
              tax_id: null
            });
            totalSaleAmount += finalAmount;
          }

          if (!saleItems.length) continue;

          let pDate = getVal(first, "date", "voucherdate", "invoicedate", "billdate", "date");

          if (!pDate) {
            for (const k in first) {
              const val = first[k];
              if (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val.getTime())) {
                pDate = val;
                break;
              }
              if (typeof val === "string" && val.match(/^\d{1,4}[/-]\d{1,4}[/-]\d{1,4}$/)) {
                pDate = val;
                break;
              }
              // Add Numeric (Excel Serial) check
              if (typeof val === "number" && val > 10000 && val < 100000) {
                pDate = val;
                break;
              }
            }
          }

          // Guaranteed Fallback: Extract from key if still missing
          if (!pDate) {
            const [kDate] = key.split("_");
            if (kDate !== "no-date") pDate = kDate;
          }
          const pType = getVal(first, "paymenttype", "payment", "paymentmode", "mode", "paymentstatus");
          const paid = getVal(first, "paidamount", "paid", "amountpaid", "paid");
          const narration = getVal(first, "narration", "remarks", "note", "description", "remarks");
          const invoiceNo = getVal(first, "invoiceno", "billno", "invoice_no", "invoicenumber", "billnumber");

          // Multi-branch Company Details
          const compName = getVal(first, "company_name", "companyname", "billing_name");
          const compGst = getVal(first, "company_gst_no", "company_gst", "companygst", "billing_gst");
          const compAddr = getVal(first, "company_address", "company_addr", "billing_address");
          const compPin = getVal(first, "company_pincode", "company_pin", "billing_pincode");
          const compCity = getVal(first, "company_city", "billing_city");
          const compState = getVal(first, "company_state", "billing_state");
          const compContact = getVal(first, "company_contact_no", "company_phone", "billing_phone", "company_contact");
          const compEmail = getVal(first, "company_email", "billing_email");
          const compPan = getVal(first, "company_pan_number", "company_pan", "billing_pan");

          const voucherDate = pDate ? toLocalYYYYMMDD(pDate) : toLocalYYYYMMDD(new Date());

          allBills.push({
            invoice_no: invoiceNo ? String(invoiceNo).trim() : undefined,
            voucher_date: voucherDate,
            mode: (getVal(first, "mode", "type", "billtype") || "SERVICE").toUpperCase(),
            party_id: partyId,
            narration: narration || "Bulk Excel Upload",
            total_amount: Math.round(totalSaleAmount * 100) / 100,
            payment_type: (pType || "NONE").toUpperCase(),
            paid_amount: Math.round(money(paid) * 100) / 100,
            due_amount: Math.round((totalSaleAmount - money(paid)) * 100) / 100,
            rows: saleItems,
            // Branch details
            company_name: compName,
            company_gst_no: compGst,
            company_address: compAddr,
            company_pincode: compPin,
            company_city: compCity,
            company_state: compState,
            company_contact_no: compContact,
            company_email: compEmail,
            company_pan_number: compPan
          });
        }

        if (allBills.length > 0) {
          // Final Validation: Ensure every bill has a valid date
          const missingDate = allBills.find(b => !b.voucher_date || b.voucher_date === "");
          if (missingDate) {
            showError(`Import aborted: Some bills are missing a valid date. Please check your Excel column headers.`);
            setLoading(false);
            return;
          }

          try {
            const res = await bulkCreateSale({ company_id: companyId, bills: allBills });
            const results = res.data.results || [];
            const skipped = results.filter(r => r.status === "skipped") || [];
            const successCount = results.filter(r => r.status === "success").length;

            if (successCount > 0) {
              showSuccess(`Successfully imported ${successCount} invoices.`);
            }

            if (skipped.length > 0) {
              showError(`${skipped.length} invoices skipped as they already exist (Duplicate Invoice No).`);
            }

            setLoading(false);
            loadSales();
          } catch (apiErr) {
            const msg = apiErr.response?.data?.error || "Bulk import failed";
            showError(msg);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Import failed", err);
        showError("Failed to import Excel data");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedBills.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const exportSelectedToJson = async () => {
    if (!selectedIds.length) {
      showError("Please select at least one bill to export");
      return;
    }
    try {
      setLoading(true);
      const res = await exportTallyJson(selectedIds.join(","));
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      const companyName = company?.name || "Bulk";
      const safeCompanyName = companyName.replace(/[/\\?%*:|"<>]/g, '-');
      const todayStr = new Date().toISOString().split('T')[0];
      downloadAnchorNode.setAttribute("download", `${safeCompanyName}_Bulk_Export_${todayStr}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      showSuccess("Tally JSON exported successfully");
    } catch (err) {
      showError("Failed to export Tally JSON");
    } finally {
      setLoading(false);
    }
  };

  const downloadSingleJson = async (bill) => {
    setLoading(true);
    try {
      const res = await exportTallyJson(bill.id);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);

      // Clean party name for filename
      const safePartyName = (bill.party || "Sale").replace(/[/\\?%*:|"<>]/g, '-');
      const safeInvoice = (bill.invoiceNo || "").replace(/[/\\?%*:|"<>]/g, '_');

      downloadAnchorNode.setAttribute("download", `${safePartyName}_${safeInvoice}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      showError("Failed to download Tally JSON");
    } finally {
      setLoading(false);
    }
  };

  // formatDateDDMMYYYY is now imported from central utility

  const deleteBill = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteSale(id);
      setBills((prev) => prev.filter((b) => b.id !== id));
      showSuccess("Deleted successfully");
    } catch (err) {
      showError("Delete failed");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-white border-b px-5 py-3 flex items-center justify-between rounded-xl shadow-sm">
          <div className="text-lg font-semibold text-gray-800">Bulk Sales Management</div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer transition-all">
              <FileUp size={18} />
              Import Excel
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImportExcel} />
            </label>
            <button
              onClick={exportSelectedToJson}
              disabled={selectedIds.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedIds.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            >
              <FileJson size={18} />
              Export Selected ({selectedIds.length})
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-green-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Paid</div>
              <div className="text-lg font-semibold text-green-700">₹ {totalPaid.toFixed(2)}</div>
            </div>
            <div className="text-lg font-semibold text-gray-400">+</div>
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-blue-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Unpaid</div>
              <div className="text-lg font-semibold text-blue-700">₹ {totalBalance.toFixed(2)}</div>
            </div>
            <div className="text-lg font-semibold text-gray-400">=</div>
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-orange-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
              <div className="text-lg font-semibold text-orange-600">₹ {totalAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 bg-gray-100 rounded-md text-sm">Between</span>
              <DatePicker
                selected={fromDate ? new Date(fromDate) : null}
                onChange={(date) => setFromDate(toLocalYYYYMMDD(date))}
                dateFormat="dd-MM-yyyy"
                className="h-10 border rounded-md px-3 text-sm w-[150px] outline-none focus:ring-2 focus:ring-[#22A586]"
              />
              <span className="text-sm text-gray-500">To</span>
              <DatePicker
                selected={toDate ? new Date(toDate) : null}
                onChange={(date) => setToDate(toLocalYYYYMMDD(date))}
                dateFormat="dd-MM-yyyy"
                className="h-10 border rounded-md px-3 text-sm w-[150px] outline-none focus:ring-2 focus:ring-[#22A586]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">All Bulk Bills</h2>
              <span className="px-3 py-1 text-xs rounded-full bg-red-500 text-white font-semibold">
                {filteredBills.length} Records
              </span>
            </div>
            <div className="relative w-full sm:w-[280px]">
              <Search size={18} className="absolute left-3 top-[10px] text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search Invoice or Party..."
                className="h-[38px] w-full border rounded-lg pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white text-left uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-4 text-center w-12">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={paginatedBills.length > 0 && selectedIds.length === paginatedBills.length}
                    />
                  </th>
                  <th className="p-4 text-center w-12">Sr</th>
                  <th className="p-4 min-w-[150px]">Party</th>
                  <th className="p-4 w-[150px]">Invoice No</th>
                  <th className="p-4 w-[120px]">Date</th>
                  <th className="p-4 w-[100px]">Mode</th>
                  <th className="p-4 text-right w-[130px]">Total</th>
                  <th className="p-4 text-right w-[130px]">Paid</th>
                  <th className="p-4 text-right w-[130px]">Due</th>
                  <th className="p-4 text-center w-[200px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="py-20 text-center text-gray-400">Loading data...</td></tr>
                ) : paginatedBills.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center text-gray-400">No records found</td></tr>
                ) : (
                  paginatedBills.map((b, idx) => (
                    <tr key={b.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(b.id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => toggleSelectOne(b.id)}
                        />
                      </td>
                      <td className="p-4 text-center border-r">{startIndex + idx + 1}</td>
                      <td className="p-4 font-medium">{b.party}</td>
                      <td className="p-4 text-indigo-600 font-semibold">{b.invoiceNo}</td>
                      <td className="p-4 text-gray-600">{formatDateDDMMYYYY(b.date)}</td>
                      <td className="p-4"><span className="px-2 py-1 rounded-md bg-gray-100 text-[10px] font-bold">{b.mode}</span></td>
                      <td className="p-4 text-right font-semibold">₹ {b.grandTotal.toFixed(2)}</td>
                      <td className="p-4 text-right text-green-600">₹ {b.paid.toFixed(2)}</td>
                      <td className="p-4 text-right text-red-600">₹ {b.due.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => downloadSingleJson(b)} className="p-2 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100" title="Download JSON">
                            <FileJson size={18} />
                          </button>
                          <button onClick={() => deleteBill(b.id)} className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(startIndex + itemsPerPage, filteredBills.length)}</span> of <span className="font-semibold">{filteredBills.length}</span> entries
              </div>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1 border rounded-md text-sm ${currentPage === i + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

