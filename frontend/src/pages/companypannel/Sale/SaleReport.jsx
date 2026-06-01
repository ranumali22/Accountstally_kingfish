import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Printer, Trash2, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getCompanyProfile,
  getSaleReport,
  getSales,
  getSaleById,
} from "../../../api";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import html2pdf from "html2pdf.js";
import { showError } from "../../../components/ui/alert/Alert";
const API_BASE = import.meta.env.VITE_SERVER_URL;
export default function Sale() {
  const navigate = useNavigate();

  const toLocalYYYYMMDD = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const today = new Date();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [showView, setShowView] = useState(false);
  const [viewHtml, setViewHtml] = useState("");
  const [search, setSearch] = useState("");
  const [viewBill, setViewBill] = useState(null);

  const [bills, setBills] = useState([]);
  const [company, setCompany] = useState(null);
  const [banks, setBanks] = useState([]);
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState("");

  const [partySuggestions, setPartySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const money = (v) => Number(v || 0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const res = await getCompanyProfile();
        setCompany(res.data.data || null);
      } catch (err) {
        console.error("Company fetch failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const companyData = JSON.parse(
      localStorage.getItem("company_data") || "{}",
    );
    const companyId = companyData?.id;

    if (!companyId) return;

    const fetchParties = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `${API_BASE}/api/party?company_id=${companyId}`,
        );

        const partyData = res.data;

        if (Array.isArray(partyData)) {
          setParties(partyData);
        } else if (partyData) {
          setParties([partyData]);
        } else {
          setParties([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, []);

  useEffect(() => {
    const companyData = JSON.parse(
      localStorage.getItem("company_data") || "{}",
    );

    const companyId = companyData?.id;

    if (!companyId) return;

    const fetchBanks = async () => {
      try {
        setLoading(true); // ✅ START LOADER

        const res = await axios.get(
          `${API_BASE}/api/bank?company_id=${companyId}`,
        );

        const rows = res.data?.data || res.data || [];
        setBanks(rows);

        console.log("BANK DATA:", rows);
      } catch (err) {
        console.error("❌ Load banks error:", err);
      } finally {
        setLoading(false); // ✅ STOP LOADER
      }
    };

    fetchBanks();
  }, []);

  const loadSales = async (useDateFilter = false) => {
    try {
      setLoading(true);

      const params = {};

      if (useDateFilter) {
        params.fromDate = toLocalYYYYMMDD(fromDate);
        params.toDate = toLocalYYYYMMDD(toDate);
      }

      if (selectedParty) {
        params.party_id = selectedParty;
      }

      const res = await getSaleReport({
        company_id: JSON.parse(localStorage.getItem("company_data") || "{}")
          ?.id,
        ...params,
      });

      const rows = res.data.data || [];

      const mapped = rows.map((b) => ({
        id: b.id,

        // COMPANY
        company_name: b.company_name,
        company_gst_no: b.company_gst_no,
        company_address: b.company_address,
        company_city: b.company_city,
        company_state: b.company_state,
        company_pincode: b.company_pincode,

        // PARTY
        partyId: b.party_id,
        party: b.party_name || "-",
        partyName: b.party_name || "-",

        party_gstin: b.party_gstin || "-",
        party_address: b.party_address || "-",
        party_city: b.party_city || "-",
        party_state: b.party_state || "-",
        party_pincode: b.party_pincode || "-",
        party_email: b.party_email || "-",
        party_mobile: b.party_mobile || "-",

        // 🔥 IMPORTANT (ADD THIS)
        bank_id: b.bank_id,

        // BILL
        invoiceNo: b.invoice_no,
        date: b.voucher_date,
        mode: b.mode || "SALE",

        total: Number(b.total_amount || 0),
        paid: Number(b.received_amount || 0), // ✅ correct
        due: Number(b.due_amount || 0),

        rows: [],
      }));

      setBills(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleDateSearch = () => {
    if (!fromDate || !toDate) {
      showError("Please select both dates!");
      return;
    }

    if (fromDate > toDate) {
      showError("From Date should be smaller than To Date");
      return;
    }

    loadSales(true);
  };

  const handlePrint = async (bill) => {
    try {
      setLoading(true);

      const res = await getSaleById(bill.id);
      const fullBill = res.data?.data || res.data;

      const updatedBill = {
        ...bill,
        ...fullBill.header,
        rows: fullBill.items || [],
      };

      printBill(updatedBill);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearch(value);

    if (!value.trim()) {
      setPartySuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = parties.filter((p) =>
      String(p.company_name || "")
        .toLowerCase()
        .includes(value.toLowerCase()),
    );

    setPartySuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (party) => {
    setSearch(party.company_name);
    setSelectedParty(party.id);
    setShowSuggestions(false);

    // optional: auto load
    loadSales();
  };

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const s = search.toLowerCase();
      return (
        String(b.invoiceNo || "")
          .toLowerCase()
          .includes(s) ||
        String(b.partyName || "")
          .toLowerCase()
          .includes(s) ||
        String(b.paymentType || "")
          .toLowerCase()
          .includes(s)
      );
    });
  }, [bills, search]);

  // PAGINATION LOGIC
  const totalRows = filteredBills.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredBills.slice(startIndex, endIndex);
  const totalAmount = filteredBills.reduce((sum, b) => sum + money(b.total), 0);
  const totalPaid = filteredBills.reduce((sum, b) => sum + money(b.paid), 0);
  const totalBalance = filteredBills.reduce((sum, b) => sum + money(b.due), 0);
  const formatDateDDMMYYYY = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date)) return "-";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };
  const getInvoiceHtml = (bill) => {
    const c = company || {};

    const companyData = {
      name: bill.company_name || company?.name || "COMPANY NAME",

      address1: bill.company_address || company?.address || "",

      address2: `${
        bill.company_city || company?.city || ""
      }, ${bill.company_state || company?.state || ""} - ${
        bill.company_pincode || company?.pincode || ""
      }`,

      gst_number: bill.company_gst_no || company?.gst_number || "-",

      email: company?.email || "-",

      website: company?.website || "-",

      logo: company?.logo
        ? `${API_BASE}/${company.logo}`
        : "https://dummyimage.com/140x45/0f172a/ffffff.png&text=LOGO",
    };

    const invoiceDate = formatDateDDMMYYYY(bill.date);
    const invoiceNo = bill.invoiceNo || "-";

    const billToName = bill.party_name || bill.partyName || bill.party || "-";
    const billToGstin = bill.party_gstin || "-";
    const billToAddress = bill.party_address || "-";
    const billToDetails = [
      bill.party_city,
      bill.party_state,
      bill.party_pincode ? `PIN: ${bill.party_pincode}` : ""
    ].filter(x => x).join(", ");
    
    const billToEmail = bill.party_email || "-";
    const billToMobile = bill.party_mobile || "-";
    const reference = bill.reference || "Paid";

    const billToState = (bill.party_state || "").trim().toLowerCase();
    const companyState = (bill.company_state || company?.state || "").trim().toLowerCase();
    const isIntra = billToState === companyState || !billToState;

    let totalTaxCalculated = 0;
    const subTotal = bill.rows?.reduce((sum, r) => {
      let tax = Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0) + Number(r.igst_amount || 0);
      if (tax === 0 && Number(r.tax_percent || 0) > 0) {
        tax = (Number(r.amount || 0) * Number(r.tax_percent)) / (100 + Number(r.tax_percent));
      }
      totalTaxCalculated += tax;
      return sum + (Number(r.amount || 0) - tax);
    }, 0);

    let igst = 0, cgst = 0, sgst = 0;
    if (isIntra) {
      cgst = totalTaxCalculated / 2;
      sgst = totalTaxCalculated / 2;
    } else {
      igst = totalTaxCalculated;
    }

    const tableTotal = bill.rows?.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0,
    );

    // IMPORTANT: use backend total
    const grandTotal = Number(bill.total ?? bill.grandTotal ?? 0);

    const paidAmount = Number(bill.paid ?? 0);

    const balanceAmount = grandTotal - paidAmount;

    // const bank = banks?.[0] || {};
    const bank =
      banks.find((bk) => Number(bk.id) === Number(bill.bank_id)) || {};
    const bankName = bank.bank_name || "-";
    const accHolder = bank.holder_name || companyData.name || "-";
    const accNo = bank.account_no || "-";
    const ifsc = bank.ifsc || "-";
    const upiId = bank.upi_id || "";

    const qrImg = bank?.qr_image
      ? `${API_BASE}/uploads/qr/${bank.qr_image}`
      : bank?.upi_id
        ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
            `upi://pay?pa=${bank.upi_id}&pn=${encodeURIComponent(accHolder)}&cu=INR`,
          )}`
        : "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SALE-UPI";

    const items = bill.rows || [];

    const itemsHtml = items.length
      ? items
          .map((r, i) => {
            const cgstVal = Number(r.cgst_amount || 0);
            const sgstVal = Number(r.sgst_amount || 0);
            const igstVal = Number(r.igst_amount || 0);

            let rowTax = cgstVal + sgstVal + igstVal;
            const rowAmount = Number(r.amount || 0);
            const rowTaxPercent = Number(r.tax_percent || 0);

            if (rowTax === 0 && rowTaxPercent > 0) {
              rowTax = (rowAmount * rowTaxPercent) / (100 + rowTaxPercent);
            }

            const price = rowAmount - rowTax;

            return `
        <tr>
          <td>${i + 1}. ${r.item_name || "-"}</td>
          <td>${r.hsn || "-"}</td>
          <td class="right"> ${price.toFixed(2)}</td>
          <td class="right">${rowTaxPercent.toFixed(2)}</td>
          <td class="right"> ${rowTax.toFixed(2)}</td>
          <td class="right"><b> ${rowAmount.toFixed(2)}</b></td>
        </tr>
      `;
          })
          .join("")
      : `
    <tr>
      <td>-</td>
      <td>-</td>
      <td class="right"> 0.00</td>
      <td class="right">0%</td>
      <td class="right"> 0.00</td>
      <td class="right"> 0.00</td>
    </tr>
  `;

    return `
    <html>
      <head>
        <title>Invoice</title>
        <style>
          *{ box-sizing:border-box; }
          body{
            font-family: Arial, sans-serif;
            padding: 20px;
            background:#fff;
            color:#111;
          }
          .page{
             width: 100%;
            max-width:820px;
               margin: auto;
          }
          .topHeader{
            display:flex;
            justify-content:space-between;
            gap:14px;
            align-items:flex-start;
          }
          .tax{
            font-size:11px;
            font-weight:700;
            color:#2563eb;
            margin-bottom:4px;
          }
          .companyName{
            font-size:16px;
            font-weight:800;
            margin:0;
            letter-spacing:.2px;
          }
          .companyInfo{
            font-size:11px;
            line-height:1.5;
            margin-top:4px;
            color:#111;
          }
          .rightTop{
            text-align:right;
            min-width:240px;
          }
          .original{
            font-size:10px;
            font-weight:700;
            color:#111;
            margin-bottom:6px;
          }
          .logo{
            width:140px;
            height:auto;
            margin-top:2px;
              object-fit: contain;
             margin-left: auto
          }
          .hr{
            height:1px;
            background:#e5e7eb;
            margin:12px 0;
          }
       .row2{
  display:grid;
  grid-template-columns: 1fr;
  gap:14px;
}

@media (min-width: 640px){
  .row2{
    grid-template-columns: 1fr 290px;
  }
}

          .billTo{
            font-size:11px;
            line-height:1.55;
          }
          .box{
            border:1px solid #dbeafe;
            background:#f8fafc;
            border-radius:8px;
            padding:10px;
            font-size:11px;
          }
          .boxGrid{
            display:grid;
            grid-template-columns: 1fr 1fr;
            gap:10px;
          }
          .boxTitle{
            font-weight:700;
            color:#111;
            margin-bottom:4px;
          }
          .ref{
            margin-top:10px;
            font-size:11px;
          }
          table{
            width:100%;
            border-collapse:collapse;
            margin-top:10px;
            font-size:11px;
          }
          th{
            text-align:left;
            background:#f1f5f9;
            padding:10px;
            border:1px solid #e5e7eb;
            font-weight:700;
          }
          td{
            padding:10px;
            border:1px solid #e5e7eb;
            vertical-align:top;
          }
          .right{ text-align:right; }
        .bottom{
            display:grid;
          grid-template-columns: 1fr 1fr 1fr;
            gap:14px;
            margin-top:12px;
            align-items:start;
          }
          .paymentBox{
            font-size:11px;
            line-height:1.6;
          }
          .qrCenterBox{
            display:flex;
            justify-content:center;
            align-items:center;
            padding-top:18px;
          }
          .qrRow{
            display:flex;
            gap:12px;
            align-items:center;
          }
       .qr{
  width: 145px;
  height: 170px;
  border:1px solid #e5e7eb;
  border-radius:8px;
  padding:6px;
  background:#fff;
}

          .phonepeLine{
            display:flex;
            align-items:center;
            gap:6px;
            font-size:12px;
            font-weight:700;
          }
          .phonepeDot{
            width:18px;
            height:18px;
            border-radius:50%;
            background:#6d28d9;
            color:#fff;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:11px;
            font-weight:800;
          }
          .accepted{
            margin-top:4px;
            font-size:10px;
            font-weight:800;
            color:#2563eb;
          }
          .scanText{
            margin-top:4px;
            font-size:10px;
            color:#6b7280;
          }
          .totals{
  border-radius:10px;
  overflow:hidden;
  border:1px solid #d1d5db;
  width: 240px;
  margin-left:auto;
  font-size:13px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

          .tline{
            display:flex;
            justify-content:space-between;
            padding:10px 12px;
            border-bottom:1px solid #e5e7eb;
            font-size:11px;
          }
          .tline:last-child{ border-bottom:none; }
          .grand{
            background:#1d4ed8;
            color:#fff;
            font-weight:800;
          }
          .paid{
            background:#0f766e;
            color:#fff;
            font-weight:800;
          }
          .bal{
            background:#9ca3af;
            color:#fff;
            font-weight:800;
          }
          .note{
            text-align:center;
            font-size:10px;
            color:#1C2433;
            margin-top:14px;
            line-height:1.4;
          }
        @media print{
           body{ padding:0; }
           .page{
               width:100%;
             max-width:100%;
              }
        </style>
      </head>

      <body>
        <div class="page">

          <div class="topHeader">
            <div>
              <div class="tax">TAX INVOICE</div>
              <h2 class="companyName">${companyData.name}</h2>

              <div class="companyInfo">
                ${companyData.address1}<br/>
                ${companyData.address2}<br/>
                <b>GSTIN:</b> ${companyData.gst_number}
              </div>
            </div>

            <div class="rightTop">
              <div class="original">ORIGINAL FOR RECIPIENT</div>
              <img class="logo" src="${companyData.logo}" />
            </div>
          </div>

          <div class="hr"></div>

          <div class="row2">
           <div class="billTo">
              <b>Bill To:</b><br/>
              <b>${billToName}</b><br/>
              <b>GSTIN:</b> ${billToGstin}<br/>
              <b>Address:</b> ${billToAddress}<br/>
              ${billToDetails ? `<b>Details:</b> ${billToDetails}<br/>` : ""}
              <b>Email:</b> ${billToEmail}<br/>
              <b>Mobile No:</b> ${billToMobile}
            </div>

            <div>
              <div class="box">
                <div class="boxGrid">
                  <div>
                    <div class="boxTitle">Invoice Date:</div>
                    ${invoiceDate}
                  </div>
                  <div>
                    <div class="boxTitle">Invoice Number:</div>
                    ${invoiceNo}
                  </div>
                </div>
              </div>

              <div class="ref">
                <b>Reference:</b> ${reference}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
              <th>Description</th>
<th style="width:90px;">HSN/SAC</th>
<th style="width:90px;" class="right">Price</th>
<th style="width:70px;" class="right">Tax %</th>
<th style="width:110px;" class="right">Tax Amount</th>
<th style="width:120px;" class="right">Amount</th>

              </tr>
            </thead>

            <tbody>
              ${itemsHtml}

             <tr style="font-weight:700; background:#f1f5f9;">
  <td colspan="5" class="right">Total</td>
 <td class="right"> ${tableTotal.toFixed(2)}</td>

</tr>

            </tbody>
          </table>

          <div class="bottom">
            <div class="paymentBox">
              <b>Payment Info:</b><br/>
              Please make all cheques/DD payable to<br/>
              <b>${companyData.name}</b><br/><br/>

              <b>Bank:</b> ${bankName}<br/>
              <b>A/C Holder Name:</b> ${accHolder}<br/>
              <b>A/C No:</b> ${accNo}<br/>
              <b>IFSC Code:</b> ${ifsc}<br/>
            </div>

           <div class="qrWrapper">
 

             <div class="qrOverlay">
                  <div class="phonepeLine">
                  
    </div>
 
  </div>
   <img class="qr" src="${qrImg}" />
</div>


            <div class="totals">
              <div class="tline"><span>Subtotal</span><span> ${subTotal.toFixed(2)}</span></div>
              <div class="tline"><span>IGST</span><span> ${igst.toFixed(2)}</span></div>
              <div class="tline"><span>CGST</span><span> ${cgst.toFixed(2)}</span></div>
              <div class="tline"><span>SGST</span><span> ${sgst.toFixed(2)}</span></div>

              <div class="tline grand"><span>Grand Total</span><span> ${grandTotal.toFixed(2)}</span></div>
              <div class="tline paid"><span>Paid amount</span><span> ${paidAmount.toFixed(2)}</span></div>
              <div class="tline bal"><span>Due amount</span><span> ${balanceAmount.toFixed(2)}</span></div>
            </div>
          </div>

          <div class="note">
            Thank you for your business.
          </div>

        </div>
      </body>
    </html>
  `;
  };
  const printBill = (bill) => {
    const html = getInvoiceHtml(bill);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();

    win.onload = () => {
      win.print();
      win.onafterprint = () => win.close();
    };
  };
  const openView = async (bill) => {
    try {
      setLoading(true);

      const res = await getSaleById(bill.id);
      const fullBill = res.data?.data || res.data;

      const updatedBill = {
        ...bill,
        ...fullBill.header,
        rows: fullBill.items || [],
      };

      setViewBill(updatedBill);
      setViewHtml(getInvoiceHtml(updatedBill));
      setShowView(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoicePdf = async (bill) => {
    try {
      setLoading(true);

      const res = await getSaleById(bill.id);
      const fullBill = res.data?.data || res.data;

      const updatedBill = {
        ...bill,
        ...fullBill.header,
        rows: fullBill.items || [],
      };

      const html = getInvoiceHtml(updatedBill);

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;

      const page = wrapper.querySelector(".page");
      page.style.width = "190mm";
      page.style.maxWidth = "180mm";

      document.body.appendChild(wrapper);

      await html2pdf()
        .from(wrapper)
        .set({
          filename: `Invoice_${bill.invoiceNo}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();

      document.body.removeChild(wrapper);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      try {
        if (!url) return resolve(null);

        // already base64
        if (url.startsWith("data:")) {
          return resolve(url);
        }

        // fix relative path
        let fullUrl = url;

        // if (!url.startsWith("http")) {
        //   fullUrl = `${import.meta.env.VITE_API_BASE}/${url}`;
        // }

        if (!url.startsWith("http")) {
          fullUrl = `${API_BASE}/${url}`;
        }

        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.onload = function () {
          const canvas = document.createElement("canvas");

          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext("2d");

          ctx.drawImage(img, 0, 0);

          const base64 = canvas.toDataURL("image/png");

          resolve(base64);
        };

        img.onerror = function () {
          console.warn("Logo failed to load");

          resolve(null);
        };

        img.src = fullUrl;
      } catch {
        resolve(null);
      }
    });
  };

  const mapSaleData = (rows) => {
    return rows.map((b) => ({
      total: Number(b.total_amount || 0),
      paid: Number(b.received_amount || 0),
      due: Number(b.due_amount || 0),
      party: b.party_name || "-",
      invoice: b.invoice_no,
      date: b.voucher_date,
      mode: b.mode,
    }));
  };

  const exportPDF = async () => {
    try {
      setLoading(true);

      const company = JSON.parse(localStorage.getItem("company_data")) || {};
      const params = {
        fromDate: toLocalYYYYMMDD(fromDate),
        toDate: toLocalYYYYMMDD(toDate),
        party_id: selectedParty || "",
        search: search || "",
      };

      const res = await getSaleReport({
        company_id: company?.id,
        ...params,
      });

      const apiRows = res.data?.data || [];
      const rows = mapSaleData(apiRows);

      const doc = new jsPDF("l", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const todayDate = new Date().toLocaleDateString("en-GB");

      const base64Logo = await loadImageAsBase64(company.logo);

      /* ================= HEADER WITH PERFECT LOGO ================= */
      let y = 16;
      let logoHeight = 0;

      if (base64Logo) {
        const img = new Image();
        img.src = base64Logo;
        await new Promise((resolve) => (img.onload = resolve));

        const maxWidth = 45;
        const maxHeight = 22;

        let logoWidth = maxWidth;
        logoHeight = (img.height / img.width) * logoWidth;

        if (logoHeight > maxHeight) {
          logoHeight = maxHeight;
          logoWidth = (img.width / img.height) * logoHeight;
        }

        doc.addImage(base64Logo, "PNG", 14, 10, logoWidth, logoHeight);
      }

      const headerCenterY = logoHeight > 0 ? 10 + logoHeight / 2 : y;

      /* ================= COMPANY NAME ================= */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30);

      doc.text(
        (company.name || "").toUpperCase(),
        pageWidth / 2,
        headerCenterY - 3,
        { align: "center" },
      );

      /* ================= COMPANY INFO ================= */
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80);

      const infoLine = [
        [company.city, company.state, company.pincode].filter(Boolean).join(" "),
        company.mobile && `Mob: ${company.mobile}`,
        company.gst_number && `GSTIN: ${company.gst_number}`,
      ]
        .filter(Boolean)
        .join("   |   ");

      if (infoLine) {
        doc.text(infoLine, pageWidth / 2, headerCenterY + 3, {
          align: "center",
        });
      }

      if (company.address) {
        doc.setFontSize(8.5);
        doc.text(company.address, pageWidth / 2, headerCenterY + 8, {
          align: "center",
          maxWidth: pageWidth - 60,
        });
      }

      const dividerY = headerCenterY + 13;
      doc.setDrawColor(200);
      doc.line(14, dividerY, pageWidth - 14, dividerY);

      y = dividerY + 10;

      /* ================= REPORT TITLE ================= */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0);

      doc.text("SALES REPORT", pageWidth / 2, y, { align: "center" });

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text(
        `From : ${fromDate.toLocaleDateString(
          "en-GB",
        )}   To : ${toDate.toLocaleDateString("en-GB")}`,
        14,
        y,
      );

      doc.text(`Date : ${todayDate}`, pageWidth - 14, y, { align: "right" });

      y += 6;

      /* ================= TABLE ================= */
      let totalAmount = 0;
      let totalPaid = 0;
      let totalDue = 0;

      const tableData = rows.map((b, index) => {
        totalAmount += b.total;
        totalPaid += b.paid;
        totalDue += b.due;

        return [
          index + 1,
          b.party,
          b.invoice,
          formatDateDDMMYYYY(b.date),
          b.mode,
          b.total.toFixed(2),
          b.paid.toFixed(2),
          b.due.toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [
          ["Sr", "Party", "Invoice", "Date", "Mode", "Total", "Paid", "Due"],
        ],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          lineColor: [230, 230, 230],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [45, 55, 72],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
        },
      });

      /* ================= SUMMARY BOX ================= */
      const finalY = doc.lastAutoTable.finalY + 10;
      const boxWidth = 80;
      const boxHeight = 24;
      const boxX = pageWidth - boxWidth - 14;
      const boxY = finalY;

      // Adjust boxY if it goes beyond page height
      if (boxY + boxHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
      } else {
        y = boxY;
      }

      doc.setFillColor(245, 247, 250);
      doc.rect(boxX, y, boxWidth, boxHeight, "F");

      doc.setDrawColor(200);
      doc.rect(boxX, y, boxWidth, boxHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      // Total Amount
      doc.setTextColor(0);
      doc.text("Total Amount :", boxX + 5, y + 7);
      doc.setTextColor(0);
      doc.text(totalAmount.toFixed(2), boxX + boxWidth - 5, y + 7, {
        align: "right",
      });

      // Total Paid
      doc.setTextColor(0);
      doc.text("Total Paid :", boxX + 5, y + 14);
      doc.setTextColor(0, 140, 0);
      doc.text(totalPaid.toFixed(2), boxX + boxWidth - 5, y + 14, {
        align: "right",
      });

      // Total Due
      doc.setTextColor(0);
      doc.text("Total Due :", boxX + 5, y + 21);
      doc.setTextColor(200, 0, 0);
      doc.text(totalDue.toFixed(2), boxX + boxWidth - 5, y + 21, {
        align: "right",
      });

      /* ================= FOOTER ================= */
      const pageCount = doc.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);

        doc.text(company.name || "", 14, pageHeight - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, {
          align: "right",
        });
      }

      doc.save(`Sales_Report_${todayDate.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      setLoading(true);

      const params = {
        fromDate: toLocalYYYYMMDD(fromDate),
        toDate: toLocalYYYYMMDD(toDate),
        party_id: selectedParty || "",
        search: search || "", // ✅ add this if API supports
      };

      const res = await getSaleReport({
        company_id: JSON.parse(localStorage.getItem("company_data") || "{}")
          ?.id,
        ...params,
      });

      const apiRows = res.data?.data || [];
      const rows = mapSaleData(apiRows);

      const data = rows.map((b, index) => ({
        Sr: index + 1,
        Party: b.party,
        InvoiceNo: b.invoice,
        Date: formatDateDDMMYYYY(b.date),
        Mode: b.mode,
        Total: b.total,
        Paid: b.paid,
        Due: b.due,
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
      XLSX.writeFile(
        workbook,
        `Sales_Report_${new Date().toLocaleDateString()}.xlsx`,
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-white border-b px-5 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-800">
            All Sales Reports
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-green-50 hover:bg-green-100 transition p-4 flex flex-col">
              <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                Paid Amount
              </span>

              <span className="mt-2 text-2xl font-bold text-green-800">
                {totalPaid.toFixed(2)}
              </span>

              <span className="text-xs text-green-600 mt-1">
                Completed payments
              </span>
            </div>

            <div className="rounded-xl border bg-blue-50 hover:bg-blue-100 transition p-4 flex flex-col">
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                Unpaid Amount
              </span>

              <span className="mt-2 text-2xl font-bold text-blue-800">
                {totalBalance.toFixed(2)}
              </span>

              <span className="text-xs text-blue-600 mt-1">
                Pending payments
              </span>
            </div>

            <div className="rounded-xl border bg-orange-50 hover:bg-orange-100 transition p-4 flex flex-col">
              <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                Total Amount
              </span>

              <span className="mt-2 text-2xl font-bold text-orange-800">
                {totalAmount.toFixed(2)}
              </span>

              <span className="text-xs text-orange-600 mt-1">
                Overall sales
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-visible">
          <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-[240px] z-[9999]">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => search && setShowSuggestions(true)}
                    placeholder="Search party..."
                    className="
      h-10 w-full
      border border-gray-300
      rounded-lg
      pl-9 pr-3
      text-sm
      bg-white
      shadow-sm
      focus:outline-none
      focus:ring-2 focus:ring-green-500
    "
                  />

                  {showSuggestions && partySuggestions.length > 0 && (
                    <div
                      className="
absolute top-[44px] left-0 w-full
bg-white border border-gray-200
rounded-md shadow-xl
max-h-60 overflow-y-auto
z-[9999]
"
                      style={{
                        position: "absolute",
                      }}
                    >
                      {partySuggestions.map((party) => (
                        <div
                          key={party.id}
                          onMouseDown={() => handleSuggestionClick(party)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 border-b last:border-none"
                        >
                          {party.company_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DatePicker
                  selected={fromDate}
                  onChange={(date) => setFromDate(date)}
                  placeholderText="From date"
                  dateFormat="dd-MM-yyyy"
                  isClearable
                  className="
          h-10 w-[140px]
          border border-gray-300
          rounded-lg
          px-3
          text-sm
          shadow-sm
          focus:outline-none
          focus:ring-2 focus:ring-green-500
          focus:border-green-500
          transition
        "
                />

                <span className="text-sm font-medium text-gray-500">To</span>

                <DatePicker
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  dateFormat="dd-MM-yyyy"
                  placeholderText="To date"
                  isClearable
                  className="
          h-10 w-[140px]
          border border-gray-300
          rounded-lg
          px-3
          text-sm
          shadow-sm
          focus:outline-none
          focus:ring-2 focus:ring-green-500
          focus:border-green-500
          transition
        "
                />

                <button
                  onClick={() => loadSales(true)}
                  className="
          h-10 px-6
          bg-green-600
          text-white
          rounded-lg
          text-sm font-semibold
          shadow-sm
          hover:bg-green-700
          hover:shadow-md
          active:scale-[0.98]
          transition
        "
                >
                  Search
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu(!showExportMenu);
                  }}
                  className="
      h-10 px-5
      bg-indigo-600
      text-white
      rounded-lg
      text-sm font-semibold
      shadow-sm
      hover:bg-indigo-700
      flex items-center gap-2
    "
                >
                  Export
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      showExportMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showExportMenu && (
                  <div
                    className="
        absolute right-0 mt-2 w-44
        bg-white border rounded-lg shadow-lg
        z-50 overflow-hidden
      "
                  >
                    <button
                      onClick={() => {
                        exportPDF();
                        setShowExportMenu(false);
                      }}
                      className="
          w-full text-left px-4 py-2 text-sm
          hover:bg-red-50 hover:text-red-600
          flex items-center gap-2
          transition-colors
        "
                    >
                      <FileText size={16} className="text-red-600" />
                      Export PDF
                    </button>

                    <button
                      onClick={() => {
                        exportExcel();
                        setShowExportMenu(false);
                      }}
                      className="
          w-full text-left px-4 py-2 text-sm
          hover:bg-green-50 hover:text-green-600
          flex items-center gap-2
          transition-colors
        "
                    >
                      <FileSpreadsheet size={16} className="text-green-600" />
                      Export Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, totalRows)} of{" "}
                {totalRows} entries
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page:</span>

                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#666] text-white">
                <tr>
                  <th className="p-3 text-center w-12 border-r border-white/20">
                    Sr
                  </th>
                  <th className="p-3 text-left min-w-[140px] border-r border-white/20">
                    Party
                  </th>
                  <th className="p-3 text-left w-[160px] border-r border-white/20">
                    Invoice No
                  </th>
                  <th className="p-3 text-left w-[140px] border-r border-white/20">
                    Date
                  </th>
                  <th className="p-3 text-left w-[120px] border-r border-white/20">
                    Mode
                  </th>
                  <th className="p-3 text-right w-[140px] border-r border-white/20">
                    Total
                  </th>
                  <th className="p-3 text-right w-[140px] border-r border-white/20">
                    Paid
                  </th>
                  <th className="p-3 text-right w-[140px] border-r border-white/20">
                    Due
                  </th>
                  <th className="p-3 text-center w-[220px]">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  currentRows.map((b, index) => (
                    <tr key={b.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-center border">
                        {startIndex + index + 1}
                      </td>

                      <td className="p-3 border">{b.party}</td>

                      <td className="p-3 font-medium border">{b.invoiceNo}</td>

                      <td className="p-3 border">
                        {formatDateDDMMYYYY(b.date)}
                      </td>

                      <td className="p-3 border">{b.mode}</td>

                      <td className="p-2 whitespace-nowrap border">
                        {money(b.total).toFixed(2)}
                      </td>

                      <td className="p-3 whitespace-nowrap border">
                        {money(b.paid).toFixed(2)}
                      </td>

                      <td className="p-3 whitespace-nowrap text-red-600 border">
                        {money(b.due).toFixed(2)}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                            title="View"
                            onClick={() => openView(b)}
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                            title="Print"
                            onClick={() => handlePrint(b)}
                          >
                            <Printer size={18} />
                          </button>

                          <button
                            onClick={() => downloadInvoicePdf(b)}
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                First
              </button>

              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded ${
                    currentPage === i + 1
                      ? "bg-green-600 text-white"
                      : "bg-white"
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>

      {showView && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-bold text-gray-800">Invoice Preview</h2>

              <div className="flex gap-2">
                <button
                  onClick={() => printBill(viewBill)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                >
                  Print
                </button>

                <button
                  onClick={() => setShowView(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="h-[80vh]">
              <iframe
                title="Invoice View"
                srcDoc={viewHtml}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
