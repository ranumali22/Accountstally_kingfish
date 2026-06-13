import { Eye, Pencil, Printer, Trash2, Search, Plus, X, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";
import { getCreditNotes, deleteCreditNote, getCreditNoteById, exportCreditNotesJson } from "../../../api";
import { showError, showSuccess } from "../../../components/ui/alert/Alert";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import html2pdf from "html2pdf.js";

const formatDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt)) return "-";
  return dt.toLocaleDateString("en-GB");
};

export default function CreditNoteList() {
  const navigate = useNavigate();
  const companyData = JSON.parse(localStorage.getItem("company_data") || "{}");
  const companyId = companyData.id;

  const [notes, setNotes] = useState([]);
  const [viewNote, setViewNote] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLocalLoading] = useState(false);
  const [viewHtml, setViewHtml] = useState("");
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [toDate, setToDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [selectedNos, setSelectedNos] = useState([]);

  const pageSize = 10;

  const loadData = async () => {
    if (!companyId) return;
    try {
      setLocalLoading(true);
      const res = await getCreditNotes({
        company_id: companyId,
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: toDate.toISOString().split('T')[0]
      });
      setNotes(res.data.data || []);
    } catch (err) {
      console.error(err);
      showError("Failed to load credit notes");
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId, fromDate, toDate]);

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      let fullUrl = url.startsWith("http") ? url : `${import.meta.env.VITE_SERVER_URL}/${url}`;
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = fullUrl;
    });
  };

  const handleView = async (id) => {
    try {
      setLocalLoading(true);
      const res = await getCreditNoteById(id);
      const data = res.data;
      if (!data || !data.header) {
        showError("No data found");
        return;
      }
      setViewNote(data);
      const html = await generateInvoiceHtml(data);
      setViewHtml(html);
    } catch (err) {
      console.error(err);
      showError("Failed to load credit note");
    } finally {
      setLocalLoading(false);
    }
  };

  const generateInvoiceHtml = async (data) => {
    const company = JSON.parse(localStorage.getItem("company_data") || "{}");
    const note = data.header;
    const items = data.items || [];
    const money = (v) => Number(v || 0).toFixed(2);
    const logoBase64 = await loadImageAsBase64(company.logo);
    const signatureBase64 = await loadImageAsBase64(company.signature);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Plus Jakarta Sans', sans-serif; 
              padding: 0; 
              margin: 0; 
              color: #1e293b; 
              background-color: #ffffff;
              line-height: 1.6; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-wrapper {
              max-width: 800px;
              margin: 0 auto;
              padding: 12px 24px;
            }
            .invoice-card { 
              background: white; 
              border: none; 
              border-radius: 0;
              padding: 0; 
              box-shadow: none;
              position: relative; 
            }
            .header-flex { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              border-bottom: 1px solid #e2e8f0; 
              padding-bottom: 24px; 
              margin-bottom: 28px; 
            }
            .company-brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            .logo-img { 
              height: 64px; 
              max-width: 180px;
              object-fit: contain; 
            }
            .company-info h2 { 
              margin: 0 0 4px 0; 
              color: #0f766e; 
              font-size: 20px; 
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .company-info p { 
              margin: 2px 0; 
              font-size: 11px; 
              color: #64748b; 
              font-weight: 500;
            }
            .bill-info { 
              text-align: right; 
            }
            .badge-title {
              background-color: #f0fdfa;
              color: #0f766e;
              font-size: 11px;
              font-weight: 800;
              padding: 6px 12px;
              border-radius: 8px;
              display: inline-block;
              margin-bottom: 12px;
              letter-spacing: 1px;
              text-transform: uppercase;
              border: 1px solid #ccfbf1;
            }
            .bill-info h1 { 
              margin: 0 0 6px 0; 
              color: #0f766e; 
              font-size: 24px; 
              font-weight: 800;
              letter-spacing: -1px; 
            }
            .bill-meta-row {
              font-size: 12px;
              font-weight: 500;
              color: #64748b;
              margin: 3px 0;
            }
            .bill-meta-row strong {
              color: #0f766e;
              font-weight: 700;
            }
            .details-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 24px; 
              margin-bottom: 28px; 
            }
            .detail-box {
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 16px;
              padding: 18px;
            }
            .detail-box h4 { 
              margin: 0 0 10px 0; 
              font-size: 11px; 
              font-weight: 800;
              text-transform: uppercase; 
              color: #64748b; 
              letter-spacing: 1px; 
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 6px;
              display: block; 
            }
            .detail-box p { 
              margin: 4px 0; 
              font-size: 13px; 
              font-weight: 500;
              color: #334155;
            }
            .detail-box p strong {
              color: #0f766e;
              font-weight: 700;
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: separate; 
              border-spacing: 0;
              margin-bottom: 28px; 
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              overflow: hidden;
            }
            th { 
              background: #f8fafc; 
              color: #0f766e; 
              padding: 12px 16px; 
              text-align: left; 
              font-size: 11px; 
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #e2e8f0;
            }
            td { 
              padding: 12px 16px; 
              border-bottom: 1px solid #e2e8f0; 
              font-size: 13px; 
              font-weight: 500;
              color: #334155;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .text-right { 
              text-align: right; 
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
            }
            .totals { 
              width: 280px; 
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 14px 18px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 4px 0; 
              font-size: 13px; 
              font-weight: 500;
              color: #64748b;
            }
            .grand-total { 
              border-top: 1px dashed #e2e8f0; 
              margin-top: 6px; 
              padding-top: 10px; 
              font-weight: 800; 
              font-size: 16px; 
              color: #0f766e; 
            }
            .footer { 
              margin-top: 40px; 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-end; 
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
            .signature-box { 
              text-align: center; 
              width: 200px; 
            }
            .signature-box img { 
              height: 48px; 
              object-fit: contain; 
              margin-bottom: 6px; 
            }
            .signature-box p { 
              border-top: 1px dashed #e2e8f0; 
              padding-top: 6px; 
              margin: 4px 0 0 0;
              font-size: 11px; 
              font-weight: 700;
              color: #64748b; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            @media print {
              body { background-color: white; }
              .invoice-card { border: none; box-shadow: none; padding: 0; }
              .invoice-wrapper { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <div class="invoice-card">
              <div class="header-flex">
                <div class="company-brand">
                  ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" />` : ""}
                  <div class="company-info">
                    <h2>${company.name || "Company Name"}</h2>
                    <p>${company.address || ""}</p>
                    <p>GSTIN: ${company.gst_number || ""}</p>
                    <p>Contact: ${company.mobile || ""}</p>
                  </div>
                </div>
                <div class="bill-info">
                  <div class="badge-title">Credit Note</div>
                  <div class="bill-meta-row">Note No: <strong>${note.credit_note_no}</strong></div>
                  <div class="bill-meta-row">Date: <strong>${formatDate(note.voucher_date)}</strong></div>
                </div>
              </div>

              <div class="details-grid">
                <div class="detail-box">
                  <h4>Customer Details</h4>
                  <p><strong>${note.party_name || ""}</strong></p>
                  <p>GSTIN: ${note.gst_number || "-"}</p>
                  <p>${note.address || ""}</p>
                </div>
                <div class="detail-box">
                  <h4>Return Info</h4>
                  <p>Invoice Ref: <strong>${note.sale_invoice_no || "-"}</strong></p>
                  <p>Narration: ${note.narration || "-"}</p>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 50px">#</th>
                    <th>Item / Service</th>
                    <th>HSN</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((i, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td><span style="font-weight: 700; color: #1e293b;">${i.item_name || "Service"}</span></td>
                      <td>${i.hsn || "-"}</td>
                      <td class="text-right">₹ ${money(i.price_per_unit)}</td>
                      <td class="text-right">₹ ${money(i.tax_amount)}</td>
                      <td class="text-right">₹ ${money(Number(i.price_per_unit) + Number(i.tax_amount))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>

              <div class="totals-container">
                <div class="totals">
                  <div class="total-row grand-total">
                    <span>Credit Total</span>
                    <span>₹ ${money(note.total_amount)}</span>
                  </div>
                </div>
              </div>

              <div class="footer">
                <div style="font-size: 11px; font-weight: 500; color: #94a3b8;">
                  Generated on: ${new Date().toLocaleString()}
                </div>
                <div class="signature-box">
                  ${signatureBase64 ? `<img src="${signatureBase64}" />` : `<div style="height: 48px;"></div>`}
                  <p>Authorized Signatory</p>
                  <p style="font-weight: 800; color: #0f766e; margin-top: 4px; font-size: 11px;">${company.name}</p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async (noteNo) => {
    try {
      const res = await getCreditNoteById(noteNo);
      console.log("Credit Note Data", res.data);
      const html = await generateInvoiceHtml(res.data);
      const win = window.open("", "_blank", "width=900,height=700");
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    } catch (err) {
      showError("Print failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this credit note?")) return;
    try {
      await deleteCreditNote(id);
      showSuccess("Deleted successfully");
      loadData();
    } catch (err) {
      showError("Delete failed");
    }
  };

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = async (noteNo) => {
    try {
      setLocalLoading(true);
      const res = await exportCreditNotesJson({ ids: noteNo, company_id: companyId });
      downloadJson(res.data, `credit_note_${noteNo}.json`);
    } catch (err) {
      console.error(err);
      showError("Failed to export JSON");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDownloadPdf = async (noteNo) => {
    try {
      setLocalLoading(true);
      const res = await getCreditNoteById(noteNo);
      const htmlString = await generateInvoiceHtml(res.data);

      const wrapper = document.createElement("div");
      wrapper.innerHTML = htmlString;
      
      const invoiceWrapper = wrapper.querySelector(".invoice-wrapper");
      if (invoiceWrapper) {
        invoiceWrapper.style.width = "190mm";
        invoiceWrapper.style.maxWidth = "190mm";
      }

      document.body.appendChild(wrapper);

      html2pdf()
        .from(wrapper)
        .set({
          filename: `CreditNote_${noteNo}.pdf`,
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
      showError("Failed to download PDF");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDownloadBulk = async () => {
    try {
      setLocalLoading(true);
      const params = { company_id: companyId };
      if (selectedNos.length > 0) {
        params.ids = selectedNos.join(",");
      } else {
        params.fromDate = fromDate.toISOString().split('T')[0];
        params.toDate = toDate.toISOString().split('T')[0];
        if (search) params.search = search;
      }
      const res = await exportCreditNotesJson(params);
      if (!res.data || res.data.length === 0) {
        showError("No records found to export");
        return;
      }
      downloadJson(res.data, `credit_notes_export_${new Date().toISOString().split('T')[0]}.json`);
    } catch (err) {
      console.error(err);
      showError("Failed to export JSON");
    } finally {
      setLocalLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedNos(paginatedNotes.map(n => n.credit_note_no));
    } else {
      setSelectedNos([]);
    }
  };

  const toggleSelectOne = (noteNo) => {
    setSelectedNos(prev =>
      prev.includes(noteNo)
        ? prev.filter(no => no !== noteNo)
        : [...prev, noteNo]
    );
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n =>
      String(n.credit_note_no || "").toLowerCase().includes(search.toLowerCase()) ||
      String(n.party_name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [notes, search]);

  const totalAmount = useMemo(() => filteredNotes.reduce((s, n) => s + Number(n.total_amount || 0), 0), [filteredNotes]);
  const totalPaid = useMemo(() => filteredNotes.reduce((s, n) => s + Number(n.paid_amount || 0), 0), [filteredNotes]);
  const totalDue = useMemo(() => filteredNotes.reduce((s, n) => s + Number(n.due_amount || 0), 0), [filteredNotes]);

  const totalPages = Math.ceil(filteredNotes.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedNotes = filteredNotes.slice(startIndex, startIndex + pageSize);

  return (
    <div className="w-full min-h-screen bg-gray-50 font-sans">
      <div className="max-w-7xl mx-auto p-4 space-y-4">

        {/* STATS & FILTER SECTION */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 px-3 py-1.5 bg-gray-50 rounded-lg">Between</span>
            <DatePicker
              selected={fromDate}
              onChange={(date) => setFromDate(date)}
              dateFormat="dd-MM-yyyy"
              className="h-9 px-3 border border-gray-200 rounded-xl text-xs w-[130px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
            />
            <span className="text-gray-400 font-medium text-xs">To</span>
            <DatePicker
              selected={toDate}
              onChange={(date) => setToDate(date)}
              dateFormat="dd-MM-yyyy"
              className="h-9 px-3 border border-gray-200 rounded-xl text-xs w-[130px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
            />
            <button onClick={loadData} className="h-9 px-5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100">
              Search
            </button>
          </div>

          <div className="rounded-xl px-4 py-2 bg-orange-50 border border-orange-100 flex items-center gap-3">
            <div className="text-[10px] text-orange-600 font-extrabold uppercase tracking-wider">Total Credit Note Amount</div>
            <div className="text-base font-extrabold text-orange-600">₹ {Number(totalAmount).toFixed(2)}</div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">All Credit Note Report</h2>
              <span className="px-2.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                {filteredNotes.length} Records
              </span>
            </div>
            <div className="flex flex-1 max-w-md items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search Credit Note No / Party Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                />
              </div>
              <button onClick={handleDownloadBulk} className="h-9 px-4 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-all flex items-center gap-1.5 shadow-md shadow-orange-100 whitespace-nowrap">
                <Download size={16} />
                {selectedNos.length > 0 ? `Export JSON (${selectedNos.length})` : "Export Filtered JSON"}
              </button>
              <button onClick={() => navigate("/voucher/CNoteForm")} className="h-9 px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-100 whitespace-nowrap">
                <Plus size={16} />
                Create Credit Note
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="p-4 text-center w-12">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={paginatedNotes.length > 0 && paginatedNotes.every(n => selectedNos.includes(n.credit_note_no))}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-center w-16">Sr</th>
                  <th className="p-4 text-left">Party</th>
                  <th className="p-4 text-left">Note No</th>
                  <th className="p-4 text-left">Ref Invoice</th>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr><td colSpan={10} className="py-16 text-center text-gray-400 animate-pulse font-medium">Loading data...</td></tr>
                ) : paginatedNotes.length === 0 ? (
                  <tr><td colSpan={10} className="py-16 text-center text-gray-400 font-medium">No records found</td></tr>
                ) : (
                  paginatedNotes.map((note, idx) => (
                    <tr key={note.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedNos.includes(note.credit_note_no)}
                          onChange={() => toggleSelectOne(note.credit_note_no)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 text-center text-gray-400 font-medium">{startIndex + idx + 1}</td>
                      <td className="p-4 font-bold text-gray-800">{note.party_name}</td>
                      <td className="p-4 font-medium text-gray-600">{note.credit_note_no}</td>
                      <td className="p-4 text-gray-600">{note.sale_invoice_no || "-"}</td>
                      <td className="p-4 text-gray-600">{formatDate(note.voucher_date)}</td>
                      <td className="p-4 text-right font-bold text-gray-900">₹ {Number(note.total_amount || 0).toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleView(note.credit_note_no)} className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-all" title="View Credit Note"><Eye size={16} /></button>
                          <button onClick={() => navigate(`/voucher/CNoteForm?credit_note_no=${note.credit_note_no}`)} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all" title="Edit Credit Note"><Pencil size={16} /></button>
                          <button onClick={() => handlePrint(note.credit_note_no)} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 hover:text-emerald-700 transition-all" title="Print Credit Note"><Printer size={16} /></button>
                          <button onClick={() => handleDownloadPdf(note.credit_note_no)} className="w-8 h-8 flex items-center justify-center bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 hover:text-orange-700 transition-all" title="Download Credit Note PDF"><Download size={16} /></button>
                          <button onClick={() => handleDelete(note.credit_note_no)} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 hover:text-rose-700 transition-all" title="Delete Credit Note"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium">
              Showing <span className="text-gray-900">{startIndex + 1}</span> to <span className="text-gray-900">{Math.min(startIndex + pageSize, filteredNotes.length)}</span> of <span className="text-gray-900">{filteredNotes.length}</span> results
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Previous</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {viewNote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center px-6 py-3.5 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><Eye className="text-teal-600" size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Credit Note Review</h2>
                  <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">#{viewNote.header.credit_note_no}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrint(viewNote.header.credit_note_no)} className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-bold text-xs shadow-md shadow-teal-100"><Printer size={16} />Print Now</button>
                <button onClick={() => handleDownloadPdf(viewNote.header.credit_note_no)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-bold text-xs shadow-md shadow-orange-100" title="Download Credit Note PDF"><Download size={16} />Download PDF</button>
                <button onClick={() => setViewNote(null)} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-all"><X size={20} /></button>
              </div>
            </div>
            <div className="flex-1 bg-white overflow-hidden flex flex-col">
              <iframe srcDoc={viewHtml} className="w-full h-full border-none" title="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
