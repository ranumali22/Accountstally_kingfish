import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Printer, Trash2, Download, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCompanyProfile, getSales, deleteSale, getSaleById } from "../../../api";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useContext } from "react";
import { LoaderContext } from "../../../context/LoaderContext"; // path adjust
import html2pdf from "html2pdf.js";
import { showError } from "../../../components/ui/alert/Alert";
import { formatDate as formatDateDDMMYYYY, toYYYYMMDD as toLocalYYYYMMDD } from "../../../utils/dateUtils";
const API_BASE = import.meta.env.VITE_SERVER_URL;
export default function Sale() {
  const navigate = useNavigate();

  // ============================
  // ✅ Local Date Formatter (NO toISOString)
  // ============================
  // toLocalYYYYMMDD is now imported from central dateUtils.js

  // ============================
  // 🔥 Default month date range (FIXED)
  // ============================
  const today = new Date();
  const firstDay = toLocalYYYYMMDD(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const lastDay = toLocalYYYYMMDD(
    new Date(today.getFullYear(), today.getMonth() + 1, 0),
  );
  const [showView, setShowView] = useState(false);
  const [viewHtml, setViewHtml] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [viewBill, setViewBill] = useState(null);
  const [bills, setBills] = useState([]);
  const [company, setCompany] = useState(null);
  const [banks, setBanks] = useState([]);
  const { setLoading } = useContext(LoaderContext);
  const [loading, setLocalLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState([]);
  const money = (v) => Number(v || 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCompanyProfile();
        setCompany(res.data.data || null);
        console.log("party data->>", res.data.data);
      } catch (err) {
        console.error("Company fetch failed", err);
      }
    })();
  }, []);



  useEffect(() => {
    const companyData = JSON.parse(
      localStorage.getItem("company_data") || "{}",
    );
    const companyId = companyData?.id;
    if (!companyId) return;

    const token = localStorage.getItem("company_token");
    axios
      .get(`${API_BASE}/api/bank?company_id=${companyId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        const rows = res.data?.data || res.data || [];
        setBanks(rows);
      })
      .catch((err) => console.error("❌ Load banks error:", err));
  }, []);

  const loadSales = async () => {
    try {
      setLocalLoading(true);

      // ✅ cache show first
      const cached = localStorage.getItem("sales_cache");
      if (cached) {
        setBills(JSON.parse(cached));
      }

      const res = await getSales({
        fromDate,
        toDate,
        search,
      });

      console.log("log sales dataa ->>>>", res.data.data);

      const rows = res.data.data || [];

      const mapped = rows.map((b) => ({
        id: b.id,
        party: b.party,
        partyName: b.party,

        // ✅ ADD THESE
        party_gstin: b.party_gstin,
        party_address: b.party_address,
        party_city: b.party_city,
        party_state: b.party_state,
        party_pincode: b.party_pincode,
        party_email: b.party_email,
        party_mobile: b.party_mobile,

        invoiceNo: b.invoice_no,
        date: b.voucher_date,
        mode: b.mode,
        paid: Number(b.paid_amount),
        due: Number(b.due_amount),
        grandTotal: Number(b.total_amount),
        bank_id: b.bank_id,
        rows: b.rows || [],
      }));

      setBills(mapped);

      // ✅ cache save
      localStorage.setItem("sales_cache", JSON.stringify(mapped));
    } catch (err) {
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [fromDate, toDate]);

  const handleDateSearch = () => {
    if (!fromDate || !toDate) {
      showError("Please select both dates!");
      return;
    }

    if (fromDate > toDate) {
      showError("From Date should be smaller than To Date");
      return;
    }

    loadSales();
  };

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const s = search.toLowerCase();
      return (
        String(b.invoiceNo || "").toLowerCase().includes(s) ||
        String(b.partyName || "").toLowerCase().includes(s)
      );
    });
  }, [bills, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, fromDate, toDate]);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage);

  const totalAmount = filteredBills.reduce(
    (sum, b) => sum + money(b.grandTotal),
    0,
  );

  const totalPaid = filteredBills.reduce((sum, b) => sum + money(b.paid), 0);
  const totalBalance = filteredBills.reduce((sum, b) => sum + money(b.due), 0);

  const deleteBill = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this invoice?");
    if (!ok) return;

    try {
      await deleteSale(id);

      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      showError("Delete failed");
    }
  };

  // formatDateDDMMYYYY is now imported from central dateUtils.js

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

  const exportSelectedToJson = () => {
    const selectedData = bills.filter(b => selectedIds.includes(b.id));
    if (!selectedData.length) {
      showError("Please select at least one bill to export");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `sales_export_selected_${toLocalYYYYMMDD(new Date())}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getInvoiceHtml = (bill) => {
    const c = company || {};

    const companyData = {
      name: company?.name || company?.name || "-",

      address1: company?.address || "-",
      address2: `${company?.city || ""}, ${company?.state || ""} - ${company?.pincode || ""}`,
      gst_number: company?.gst_number || "-",

      email: company?.email || "-",
      website: company?.website || "-",

      logo: company?.logo
        ? `${API_BASE}/${company.logo}`
        : "https://dummyimage.com/140x45/0f172a/ffffff.png&text=LOGO",

      signature: company?.signature
        ? `${API_BASE}/${company.signature.replace(/\\/g, "/")}`
        : null,
    };

    console.log("BILL DATA =>", bill);

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

    const igst = bill.rows?.reduce(
      (sum, r) => sum + Number(r.igst_amount || 0),
      0,
    );

    const cgst = bill.rows?.reduce(
      (sum, r) => sum + Number(r.cgst_amount || 0),
      0,
    );

    const sgst = bill.rows?.reduce(
      (sum, r) => sum + Number(r.sgst_amount || 0),
      0,
    );

    const subTotal = bill.rows?.reduce((sum, r) => {
      const tax =
        Number(r.cgst_amount || 0) +
        Number(r.sgst_amount || 0) +
        Number(r.igst_amount || 0);

      const total = Number(r.amount || 0);

      const price = total - tax; // ✅ without tax

      return sum + price;
    }, 0);

    const totalTax = bill.rows?.reduce(
      (sum, r) => sum + Number(r.tax_amount || 0),
      0,
    );
    const grandTotal = subTotal + totalTax;
    const tableTotal = bill.rows?.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0,
    );
    const paidAmount = Number(bill.paid ?? 0);
    const balanceAmount = grandTotal - paidAmount;
    const bank =
      banks.find((bk) => Number(bk.id) === Number(bill.bank_id)) || {};
    const bankName = bank.bank_name || "-";
    const accHolder = bank.holder_name || companyData.name || "-";
    const accNo = bank.account_no || "-";
    const ifsc = bank.ifsc || "-";
    const upiId = bank.upi_id || "";

    const qrImg = bank.qr_image
      ? `${API_BASE}/uploads/qr/${bank.qr_image}`
      : upiId
        ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
          `upi://pay?pa=${upiId}&pn=${encodeURIComponent(accHolder)}&cu=INR`,
        )}`
        : "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SALE-UPI";

    const items = bill.rows || [];

    const itemsHtml = items.length
      ? items
        .map((r, i) => {
          const cgst = Number(r.cgst_amount || 0);
          const sgst = Number(r.sgst_amount || 0);
          const igst = Number(r.igst_amount || 0);

          const taxAmount = cgst + sgst + igst;
          const total = Number(r.amount || 0);
          const price = total - taxAmount;
          const taxPercent = Number(r.tax_percent || 0).toFixed(2);

          return `
        <tr>
          <td>${i + 1}. ${r.item_name || "-"}</td>

          <td>${r.hsn || "-"}</td>

          <td class="right"> ${price.toFixed(2)}</td>

          <td class="right">${taxPercent}</td>

          <td class="right"> ${taxAmount.toFixed(2)}</td>

          <td class="right"><b> ${total.toFixed(2)}</b></td>

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
            max-width:720px;
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

.signatureBox{
  text-align:right;
  margin-top:20px;
}

.signatureImg{
  width:90px;
  height:auto;
  object-fit:contain;
}

.signatureLabel{
  font-size:11px;
  margin-top:3px;
  font-weight:600;
}
        @media print{
           body{ padding:0; }
           .page{
               width:100%;
             max-width:100%;
              }
             .signatureBox{
  margin-top:30px;
  text-align:right;
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
        <img class="logo" src="${companyData.logo}" crossorigin="anonymous" />
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
          <td class="right">${tableTotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Bottom Section -->
    <div class="bottom">

      <!-- Payment -->
      <div class="paymentBox">
        <b>Payment Info:</b><br/>
        Please make all cheques/DD payable to<br/>
        <b>${companyData.name}</b><br/><br/>

        <b>Bank:</b> ${bankName}<br/>
        <b>A/C Holder Name:</b> ${accHolder}<br/>
        <b>A/C No:</b> ${accNo}<br/>
        <b>IFSC Code:</b> ${ifsc}<br/>
      </div>

      <!-- QR -->
      <div class="qrWrapper">
        <img class="qr" src="${qrImg}" />
      </div>

      <!-- Totals -->
      <div class="totals">
        <div class="tline"><span>Subtotal</span><span>${subTotal.toFixed(2)}</span></div>
        <div class="tline"><span>IGST</span><span>${igst.toFixed(2)}</span></div>
        <div class="tline"><span>CGST</span><span>${cgst.toFixed(2)}</span></div>
        <div class="tline"><span>SGST</span><span>${sgst.toFixed(2)}</span></div>

        <div class="tline grand"><span>Grand Total</span><span>${grandTotal.toFixed(2)}</span></div>
        <div class="tline paid"><span>Paid amount</span><span>${paidAmount.toFixed(2)}</span></div>
        <div class="tline bal"><span>Due amount</span><span>${balanceAmount.toFixed(2)}</span></div>
      </div>

    </div>

    <!-- Signature -->
    <div class="signatureBox">
      ${companyData.signature
        ? `<img class="signatureImg" src="${companyData.signature}" crossorigin="anonymous" />`
        : ""
      }
      <div class="signatureLabel">Authorized Signatory</div>
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
      setLoading(true); // Should probably be false but checking existing code... wait, looking at context.
      setLoading(false);
    }
  };

  const openEdit = (row) => {
    console.log("EDIT ROWsssss =", row); // debug

    localStorage.setItem("sale_edit_data", JSON.stringify(row));

    navigate(`/income/sales/create?mode=edit&id=${row.id}`);
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

      // 🔥 FORCE A4 WIDTH
      const page = wrapper.querySelector(".page");
      page.style.width = "190mm";
      page.style.maxWidth = "180mm";

      document.body.appendChild(wrapper);

      html2pdf()
        .from(wrapper)
        .set({
          // margin: 0,
          filename: `Invoice_${bill.invoiceNo}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .save()
        .then(() => {
          document.body.removeChild(wrapper);
        });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    loadSales();
  };

  return (
    <div className="w-full min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-white border-b px-5 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-800">
            Sales Management
          </div>
        </div>

        {/* Filters + Summary */}


        {/* Filters + Summary */}
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          {/* Summary Cards */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Paid */}
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-green-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Paid
              </div>
              <div className="text-lg font-semibold text-green-700 truncate">
                ₹ {Number(totalPaid || 0).toFixed(2)}
              </div>
            </div>

            <div className="text-lg font-semibold text-gray-400">+</div>

            {/* Unpaid */}
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-blue-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Unpaid
              </div>
              <div className="text-lg font-semibold text-blue-700 truncate">
                ₹ {Number(totalBalance || 0).toFixed(2)}
              </div>
            </div>

            <div className="text-lg font-semibold text-gray-400">=</div>

            {/* Total */}
            <div className="min-w-[140px] flex-1 rounded-xl p-4 bg-orange-50 border">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Total
              </div>
              <div className="text-lg font-semibold text-orange-600 truncate">
                ₹ {Number(totalAmount || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="px-3 py-2 bg-gray-100 rounded-md">
                  Between
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <DatePicker
                  selected={fromDate ? new Date(fromDate) : null}
                  onChange={(date) => setFromDate(toLocalYYYYMMDD(date))}
                  dateFormat="dd-MM-yyyy"
                  className="h-10 border rounded-md px-3 text-sm w-[160px] focus:ring-2 focus:ring-[#22A586] outline-none"
                />

                <span className="text-sm text-gray-500">To</span>

                <DatePicker
                  selected={toDate ? new Date(toDate) : null}
                  onChange={(date) => setToDate(toLocalYYYYMMDD(date))}
                  dateFormat="dd-MM-yyyy"
                  className="h-10 border rounded-md px-3 text-sm w-[160px] focus:ring-2 focus:ring-[#22A586] outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleDateSearch}
                className="h-10 px-6 rounded-md bg-[#22A586] text-white font-medium hover:bg-[#1c8f75] transition-all w-full sm:w-auto"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 flex flex-wrap items-center gap-3 justify-between border-b">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                All Bill Report
              </h2>

              <span className="px-3 py-1 text-xs rounded-full bg-red-500 text-white font-semibold">
                {filteredBills.length} Records
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-[240px]">
                <Search
                  size={20}
                  className="absolute left-3 top-[10px] text-gray-500"
                />

                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search Invoice No..."
                  className="h-[36px] w-full border border-gray-300 rounded-md pl-10 pr-3 text-sm focus:outline-none focus:border-[#FF4200]"
                />
              </div>

              <div className="flex gap-2">

                <button
                  onClick={() => navigate("/income/sales/create")}
                  className="bg-[#22A586] text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  + Create Bill
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl">
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
                {loading && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-gray-500">
                      Loading data...
                    </td>
                  </tr>
                )}

                {!loading && filteredBills.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-24 text-center text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                )}

                {!loading &&
                  paginatedBills.map((b, index) => (
                    <tr key={b.id} className={`border-b hover:bg-gray-50 ${selectedIds.includes(b.id) ? 'bg-indigo-50/30' : ''}`}>

                      <td className="p-3 text-center border">{startIndex + index + 1}</td>
                      <td className="p-3 border">{b.party}</td>
                      <td className="p-3 font-medium border">{b.invoiceNo}</td>
                      <td className="p-3 border">
                        {formatDateDDMMYYYY(b.date)}
                      </td>
                      <td className="p-3 border">{b.mode}</td>

                      <td className="p-2 whitespace-nowrap border">
                        ₹ {money(b.grandTotal).toFixed(2)}
                      </td>

                      <td className="p-3 whitespace-nowrap border">
                        ₹ {money(b.paid).toFixed(2)}
                      </td>

                      <td className="p-3 whitespace-nowrap text-red-600 border">
                        ₹ {money(b.due).toFixed(2)}
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
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
                            title="Edit"
                            onClick={() => openEdit(b)}
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                            title="Print"
                            onClick={() => printBill(b)}
                          >
                            <Printer size={18} />
                          </button>

                          <button
                            onClick={() => downloadInvoicePdf(b)}
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200"
                          >
                            <Download size={18} />
                          </button>

                          <button
                            className="h-9 w-9 flex items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                            title="Delete"
                            onClick={() => deleteBill(b.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* VIEW MODAL */}
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
