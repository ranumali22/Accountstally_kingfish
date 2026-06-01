import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeft,
} from "lucide-react";

import ContraForm from "./ContraCreate";
import { getContras, deleteContra, getContraByVoucher } from "../../../api";

export default function ContraList() {
  const [data, setData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ✅ LOCAL LOADING (important)
  const [loading, setLoading] = useState(false);

  // ✅ FETCH
  const fetchContra = async () => {
    try {
      setLoading(true);
      const res = await getContras({
        page: currentPage,
        limit: rowsPerPage,
      });

      setData(res?.data?.data || []);
      setTotalRecords(res?.data?.pagination?.totalRecords || 0);
      setTotalPages(res?.data?.pagination?.totalPages || 1);

            console.error("contra fetch :", res);
    } catch (err) {
      console.error("contra fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContra();
  }, [currentPage]);

  // ✅ DELETE (no global loader)
  const handleDelete = async (contra_no) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      setLoading(true);

      await deleteContra(contra_no);

      // instant UI update (smooth UX)
      setData((prev) => prev.filter((d) => d.contra_no !== contra_no));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalDeposit = data
    .filter((d) => d.entry_type === "Dr")
    .reduce((a, b) => a + Number(b.amount), 0);

  const totalWithdrawal = data
    .filter((d) => d.entry_type === "Cr")
    .reduce((a, b) => a + Number(b.amount), 0);

  // ================= FORM =================
  if (showForm) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="mb-4 flex items-center gap-3">
          <ArrowLeft
            className="cursor-pointer text-gray-600"
            onClick={() => {
              setShowForm(false);
              setEditData(null);
            }}
          />
          <h2 className="text-2xl font-semibold">
            {editData ? "Edit Contra Entry" : "New Contra Entry"}
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-md">
          <ContraForm
            editData={editData}
            onClose={() => {
              setShowForm(false);
              setEditData(null);
              fetchContra(); // refresh
            }}
          />
        </div>
      </div>
    );
  }

  // ================= UI =================
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-2xl p-5 flex justify-between">
          <div>
            <p className="text-gray-500">Total Entries</p>
            <h2 className="text-2xl font-bold">{data.length}</h2>
          </div>
          <Wallet className="text-blue-500" size={32} />
        </div>

        <div className="bg-white shadow rounded-2xl p-5 flex justify-between">
          <div>
            <p className="text-gray-500">Total Deposit</p>
            <h2 className="text-2xl font-bold text-green-600">
              ₹ {totalDeposit.toFixed(2)}
            </h2>
          </div>
          <ArrowDownCircle className="text-green-500" size={32} />
        </div>

        <div className="bg-white shadow rounded-2xl p-5 flex justify-between">
          <div>
            <p className="text-gray-500">Total Withdrawal</p>
            <h2 className="text-2xl font-bold text-red-600">
              ₹ {totalWithdrawal.toFixed(2)}
            </h2>
          </div>
          <ArrowUpCircle className="text-red-500" size={32} />
        </div>
      </div>

      <div className="bg-white shadow rounded-2xl p-5">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold">Contra Entries</h2>

          <button
            onClick={() => {
              setEditData(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            <Plus size={18} /> New Contra Entry
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-left">Sr No.</th>
              <th className="p-3 text-left">Contra No.</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Bank</th>
              <th className="p-3 text-left">Account No.</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    Loading data...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    {(currentPage - 1) * rowsPerPage + index + 1}{" "}
                  </td>

                  <td className="p-3">{item.contra_no}</td>

                  <td className="p-3">
                    {item.transaction_date
                      ? new Date(item.transaction_date).toLocaleDateString(
                          "en-GB",
                        )
                      : "-"}
                  </td>
                  <td className="p-3">{item.bank_name}</td>
                  <td className="p-3">{item.account_no}</td>
                  <td className="p-3 text-right font-medium">
                    ₹ {Number(item.amount).toFixed(2)}
                  </td>

                  {/* 
                  <td
                    className={`p-3 text-center font-semibold ${
                      item.entry_type === "Cr"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {item.transfer_type === "bank_to_bank"
                      ? item.entry_type === "Cr"
                        ? "Withdrawal (Bank To Bank)"
                        : "Deposit (Bank To Bank)"
                      : item.entry_type === "Cr"
                        ? "Deposit"
                        : "Withdrawal"}
                  </td> */}

                  <td
                    className={`p-3 text-center font-semibold ${
                      item.entry_type === "Cr"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {item.transfer_type === "bank_to_bank"
                      ? item.entry_type === "Cr"
                        ? "Deposit (Bank To Bank)"
                        : "Withdrawal (Bank To Bank)"
                      : item.entry_type === "Cr"
                        ? "Deposit"
                        : "Withdrawal"}
                  </td>

                  <td className="p-3 flex justify-center gap-3">
                    <Pencil
                      size={18}
                      className="text-blue-600 cursor-pointer"
                      // onClick={async () => {
                      //   const res = await getContraByVoucher(item.contra_no);

                      //   const entries = res?.data?.data || [];

                      //   const crEntry = entries.find(
                      //     (e) => e.entry_type === "Cr",
                      //   );
                      //   const drEntry = entries.find(
                      //     (e) => e.entry_type === "Dr",
                      //   );

                      //   const finalData = {
                      //     ...crEntry,
                      //     to_bank_id: drEntry?.bank_id || "",
                      //     to_account_no: drEntry?.account_no || "",
                      //     entry_type: "bank_to_bank",
                      //   };

                      //   setEditData(finalData);
                      //   setShowForm(true);
                      // }}

                      onClick={async () => {
                        const res = await getContraByVoucher(item.contra_no);

                        const entries = res?.data?.data || [];

                        // ✅ BANK TO BANK CASE
                        if (entries.length === 2) {
                          const crEntry = entries.find(
                            (e) => e.entry_type === "Cr",
                          );
                          const drEntry = entries.find(
                            (e) => e.entry_type === "Dr",
                          );

                          const finalData = {
                            ...crEntry,
                            to_bank_id: drEntry?.bank_id || "",
                            to_account_no: drEntry?.account_no || "",
                            transfer_type: "bank_to_bank",
                            entry_type: "bank_to_bank",
                          };

                          setEditData(finalData);
                        }
                        // ✅ SINGLE ENTRY CASE
                        else if (entries.length === 1) {
                          const single = entries[0];

                          const finalData = {
                            ...single,
                            transfer_type: "single",
                            entry_type: single.entry_type, // Dr / Cr
                          };

                          setEditData(finalData);
                        }

                        setShowForm(true);
                      }}
                    />

                    <Trash2
                      size={18}
                      className="text-red-600 cursor-pointer"
                      onClick={() => handleDelete(item.contra_no)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-500">
          Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
          {(currentPage - 1) * rowsPerPage + data.length} of {totalRecords}{" "}
          entries
        </p>

        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 border rounded ${
                currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
