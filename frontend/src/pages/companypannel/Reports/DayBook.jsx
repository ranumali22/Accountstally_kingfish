import { useState } from "react";
import { getDayBook } from "../../../api";
import { formatDate } from "../../../utils/dateUtils";

export default function DailyBook() {
  const COMPANY_ID = JSON.parse(
    localStorage.getItem("company_data")
  )?.id;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hideZero, setHideZero] = useState(true);

  /* ================= LOAD ================= */

  const loadDayBook = async () => {
    if (!from || !to) {
      setError("Please select From and To dates");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await getDayBook(COMPANY_ID, { from, to });
      setData(res.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          "Failed to load Day Book"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER (VOUCHER LEVEL) ================= */

  const displayData = hideZero
    ? data.filter((v) =>
        v.entries.some(
          (e) =>
            Number(e.debit || 0) !== 0 ||
            Number(e.credit || 0) !== 0
        )
      )
    : data;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-semibold">Day Book</h2>

        {from && to && (
          <p className="text-sm text-gray-500">
            Period :{" "}
            {formatDate(from)} to{" "}
            {formatDate(to)}
          </p>
        )}
      </div>

      {/* FILTER */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-sm">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={loadDayBook}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Show
        </button>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={() => setHideZero(!hideZero)}
          />
          Hide Zero Vouchers
        </label>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="text-gray-500 text-sm">
          Loading Day Book...
        </div>
      )}

      {/* EMPTY */}
      {!loading && displayData.length === 0 && (
        <p className="text-gray-500">
          No vouchers found for this period
        </p>
      )}

      {/* ================= VOUCHERS ================= */}
      {!loading &&
        displayData.map((v) => {
          const totalDr = v.entries.reduce(
            (s, e) => s + Number(e.debit || 0),
            0
          );
          const totalCr = v.entries.reduce(
            (s, e) => s + Number(e.credit || 0),
            0
          );

          const isBalanced =
            totalDr.toFixed(2) === totalCr.toFixed(2);

          return (
            <div
              key={v.voucher_id}
              className={`border rounded-lg p-4 bg-white ${
                !isBalanced ? "border-red-400" : ""
              }`}
            >
              {/* VOUCHER HEADER */}
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold">
                  {formatDate(v.voucher_date)}{" "}
                  | {v.voucher_type} | {v.voucher_no}
                </div>

                {!isBalanced && (
                  <span className="text-xs text-red-600 font-semibold">
                    ⚠ Debit / Credit Mismatch
                  </span>
                )}
              </div>

              {v.narration && (
                <div className="text-sm text-gray-600 mb-2">
                  Narration : {v.narration}
                </div>
              )}

              {/* ENTRIES */}
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1 text-left">
                      Ledger
                    </th>
                    <th className="border px-2 py-1 text-right">
                      Debit
                    </th>
                    <th className="border px-2 py-1 text-right">
                      Credit
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {v.entries.map((e, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1">
                        {e.ledger}
                      </td>
                      <td className="border px-2 py-1 text-right tabular-nums">
                        {e.debit
                          ? Number(e.debit).toFixed(2)
                          : ""}
                      </td>
                      <td className="border px-2 py-1 text-right tabular-nums">
                        {e.credit
                          ? Number(e.credit).toFixed(2)
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* TOTAL */}
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="border px-2 py-1 text-right">
                      Total
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {totalDr.toFixed(2)}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      {totalCr.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
    </div>
  );
}
