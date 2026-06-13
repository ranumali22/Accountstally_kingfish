import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";

export default function TrialBalance() {
  const navigate = useNavigate();

  const COMPANY_ID = JSON.parse(
    localStorage.getItem("company_data")
  )?.id;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hideZero, setHideZero] = useState(true);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    if (COMPANY_ID) {
      loadTrialBalance();
    }
  }, [COMPANY_ID]);

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/report/trial-balance/${COMPANY_ID}`
      );
      setRows(res.data || []);
    } catch (err) {
      console.error("Trial Balance error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= CALCULATIONS ================= */

  const displayRows = hideZero
    ? rows.filter(
      (r) => Number(r.debit || 0) !== 0 || Number(r.credit || 0) !== 0
    )
    : rows;

  const totalDebit = displayRows.reduce(
    (s, r) => s + Number(r.debit || 0),
    0
  );

  const totalCredit = displayRows.reduce(
    (s, r) => s + Number(r.credit || 0),
    0
  );

  const isMatched =
    totalDebit.toFixed(2) === totalCredit.toFixed(2);

  /* ================= UI ================= */

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Trial Balance</h2>
        <p className="text-sm text-gray-500">
          As per Financial Year
        </p>
      </div>

      {/* OPTIONS */}
      <div className="mb-3 flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={() => setHideZero(!hideZero)}
          />
          Hide Zero Balance Ledgers
        </label>
      </div>

      {/* EMPTY STATE */}
      {!loading && displayRows.length === 0 && (
        <div className="mb-4 p-3 bg-gray-100 text-sm text-gray-600 rounded">
          No transactions available for this company
        </div>
      )}

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">
                Ledger
              </th>
              <th className="border px-3 py-2 text-right">
                Debit
              </th>
              <th className="border px-3 py-2 text-right">
                Credit
              </th>
            </tr>
          </thead>

          <tbody>
            {displayRows.map((r) => (
              <tr
                key={r.ledger_id}
                className="hover:bg-gray-50"
              >
                {/* LEDGER NAME (DRILL DOWN) */}
                <td
                  className="border px-3 py-2 text-blue-600 cursor-pointer hover:underline"
                  onClick={() =>
                    navigate(`/ledger?ledger_id=${r.ledger_id}`)
                  }
                >
                  {r.ledger_name}
                </td>

                {/* DEBIT */}
                <td className="border px-3 py-2 text-right tabular-nums">
                  {r.debit > 0
                    ? Number(r.debit).toFixed(2)
                    : ""}
                </td>

                {/* CREDIT */}
                <td className="border px-3 py-2 text-right tabular-nums">
                  {r.credit > 0
                    ? Number(r.credit).toFixed(2)
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>

          {/* TOTAL */}
          <tfoot className="bg-gray-100 font-semibold border-t-2 border-gray-400">
            <tr>
              <td className="border px-3 py-2">
                Total
              </td>
              <td className="border px-3 py-2 text-right">
                {totalDebit.toFixed(2)}
              </td>
              <td className="border px-3 py-2 text-right">
                {totalCredit.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* MATCH STATUS */}
      <div
        className={`mt-4 p-3 rounded font-semibold ${isMatched
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
          }`}
      >
        {isMatched
          ? "✔ Trial Balance is Matching"
          : "✖ Trial Balance is NOT Matching"}
      </div>
    </div>
  );
}
