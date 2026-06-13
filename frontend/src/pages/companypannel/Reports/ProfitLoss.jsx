import { useEffect, useState } from "react";
import api from "../../../api";

export default function ProfitLoss() {
  const COMPANY_ID = JSON.parse(
    localStorage.getItem("company_data")
  )?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hideZero, setHideZero] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {
    if (COMPANY_ID) loadPL();
  }, [COMPANY_ID]);

  const loadPL = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/report/profit-loss/${COMPANY_ID}`
      );
      setData(res.data);
    } catch (err) {
      console.error("Profit & Loss error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATES ================= */

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading Profit & Loss Account...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load Profit & Loss
      </div>
    );
  }

  /* ================= FILTER ================= */

  const income = hideZero
    ? data.income.filter((i) => Number(i.amount) !== 0)
    : data.income;

  const expense = hideZero
    ? data.expense.filter((e) => Number(e.amount) !== 0)
    : data.expense;

  const isProfit = Number(data.netProfit) >= 0;
  const netAmount = Math.abs(Number(data.netProfit));

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          Profit & Loss Account
        </h2>
        <p className="text-sm text-gray-500">
          For the financial period
        </p>
      </div>

      {/* OPTIONS */}
      <div className="mb-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={() => setHideZero(!hideZero)}
          />
          Hide Zero Balance Ledgers
        </label>
      </div>

      {(income.length === 0 && expense.length === 0) && (
        <div className="mb-4 p-3 bg-gray-100 text-sm text-gray-600 rounded">
          No transactions for the selected period
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ================= EXPENSE ================= */}
        <div className="border rounded-lg overflow-hidden">
          <h3 className="bg-gray-100 px-4 py-2 font-semibold">
            Expenses
          </h3>

          <table className="w-full text-sm">
            <tbody>
              {expense.length === 0 && (
                <tr>
                  <td
                    colSpan="2"
                    className="text-center py-4 text-gray-400"
                  >
                    No Expenses
                  </td>
                </tr>
              )}

              {expense.map((e, i) => (
                <tr key={i}>
                  <td className="border px-3 py-2">
                    {e.ledger}
                  </td>
                  <td className="border px-3 py-2 text-right tabular-nums">
                    {Number(e.amount).toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* NET PROFIT */}
              {isProfit && (
                <tr className="bg-green-50 font-semibold">
                  <td className="border px-3 py-2">
                    Net Profit
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {netAmount.toFixed(2)}
                  </td>
                </tr>
              )}

              <tr className="font-semibold bg-gray-50">
                <td className="border px-3 py-2">
                  Total
                </td>
                <td className="border px-3 py-2 text-right">
                  {(Number(data.totalExpense) +
                    (isProfit ? netAmount : 0)
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================= INCOME ================= */}
        <div className="border rounded-lg overflow-hidden">
          <h3 className="bg-gray-100 px-4 py-2 font-semibold">
            Income
          </h3>

          <table className="w-full text-sm">
            <tbody>
              {income.length === 0 && (
                <tr>
                  <td
                    colSpan="2"
                    className="text-center py-4 text-gray-400"
                  >
                    No Income
                  </td>
                </tr>
              )}

              {income.map((i, idx) => (
                <tr key={idx}>
                  <td className="border px-3 py-2">
                    {i.ledger}
                  </td>
                  <td className="border px-3 py-2 text-right tabular-nums">
                    {Number(i.amount).toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* NET LOSS */}
              {!isProfit && (
                <tr className="bg-red-50 font-semibold">
                  <td className="border px-3 py-2">
                    Net Loss
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {netAmount.toFixed(2)}
                  </td>
                </tr>
              )}

              <tr className="font-semibold bg-gray-50">
                <td className="border px-3 py-2">
                  Total
                </td>
                <td className="border px-3 py-2 text-right">
                  {(Number(data.totalIncome) +
                    (!isProfit ? netAmount : 0)
                  ).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
