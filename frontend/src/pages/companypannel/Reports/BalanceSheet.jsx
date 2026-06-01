// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../../api";

// export default function BalanceSheet() {
//   const navigate = useNavigate();

//   const COMPANY_ID = JSON.parse(
//     localStorage.getItem("company_data")
//   )?.id;

//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [hideZero, setHideZero] = useState(true);

//   useEffect(() => {
//     if (COMPANY_ID) {
//       loadBS();
//     }
//   }, [COMPANY_ID]);

//   const loadBS = async () => {
//     try {
//       setLoading(true);
//       const res = await api.get(
//         `/report/balance-sheet/${COMPANY_ID}`
//       );
//       setData(res.data);
//     } catch (err) {
//       console.error("Balance Sheet Error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading || !data) {
//     return (
//       <div className="p-6 text-sm text-gray-500">
//         Loading Balance Sheet...
//       </div>
//     );
//   }

//   /* ================= FILTER ZERO BALANCE ================= */

//   const assets = hideZero
//     ? data.assets.filter((a) => Number(a.amount) !== 0)
//     : data.assets;

//   const liabilities = hideZero
//     ? data.liabilities.filter((l) => Number(l.amount) !== 0)
//     : data.liabilities;

//   const difference =
//     Number(data.totalAssets) - Number(data.totalLiabilities);

//   return (
//     <div className="max-w-6xl mx-auto p-6">
//       {/* HEADER */}
//       <div className="mb-4">
//         <h2 className="text-xl font-semibold">
//           Balance Sheet
//         </h2>
//         <p className="text-sm text-gray-500">
//           As per Financial Year
//         </p>
//       </div>

//       {/* OPTIONS */}
//       <div className="mb-4 text-sm">
//         <label className="flex items-center gap-2 cursor-pointer">
//           <input
//             type="checkbox"
//             checked={hideZero}
//             onChange={() => setHideZero(!hideZero)}
//           />
//           Hide Zero Balance Ledgers
//         </label>
//       </div>

//       {/* ⚠️ TALLY WARNING */}
//       {!data.isTallied && (
//         <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-sm">
//           ⚠️ Balance Sheet is NOT tallied
//         </div>
//       )}

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* ================= ASSETS ================= */}
//         <div className="border rounded-lg overflow-hidden">
//           <h3 className="bg-gray-100 px-4 py-2 font-semibold">
//             Assets
//           </h3>

//           <table className="w-full text-sm">
//             <tbody>
//               {assets.map((a, i) => (
//                 <tr key={i}>
//                   <td
//                     className="border px-3 py-2 text-blue-600 cursor-pointer hover:underline"
//                     onClick={() =>
//                       navigate(`/ledger/${a.ledger}`)
//                     }
//                   >
//                     {a.ledger}
//                   </td>
//                   <td className="border px-3 py-2 text-right">
//                     {Number(a.amount).toFixed(2)}
//                   </td>
//                 </tr>
//               ))}

//               <tr className="font-semibold bg-gray-50">
//                 <td className="border px-3 py-2">
//                   Total Assets
//                 </td>
//                 <td className="border px-3 py-2 text-right">
//                   {Number(data.totalAssets).toFixed(2)}
//                 </td>
//               </tr>
//             </tbody>
//           </table>
//         </div>

//         {/* ================= LIABILITIES ================= */}
//         <div className="border rounded-lg overflow-hidden">
//           <h3 className="bg-gray-100 px-4 py-2 font-semibold">
//             Liabilities
//           </h3>

//           <table className="w-full text-sm">
//             <tbody>
//               {liabilities.map((l, i) => (
//                 <tr
//                   key={i}
//                   className={
//                     l.ledger === "Profit & Loss A/c"
//                       ? "bg-yellow-50 font-medium"
//                       : ""
//                   }
//                 >
//                   <td
//                     className="border px-3 py-2 text-blue-600 cursor-pointer hover:underline"
//                     onClick={() =>
//                       navigate(`/ledger/${l.ledger}`)
//                     }
//                   >
//                     {l.ledger}
//                   </td>
//                   <td className="border px-3 py-2 text-right">
//                     {Number(l.amount).toFixed(2)}
//                   </td>
//                 </tr>
//               ))}

//               <tr className="font-semibold bg-gray-50">
//                 <td className="border px-3 py-2">
//                   Total Liabilities
//                 </td>
//                 <td className="border px-3 py-2 text-right">
//                   {Number(data.totalLiabilities).toFixed(2)}
//                 </td>
//               </tr>

//               {/* DIFFERENCE (TALLY STYLE) */}
//               {!data.isTallied && (
//                 <tr className="bg-red-50 font-semibold">
//                   <td className="border px-3 py-2">
//                     Difference
//                   </td>
//                   <td className="border px-3 py-2 text-right">
//                     {Math.abs(difference).toFixed(2)}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";

export default function BalanceSheet() {
  const navigate = useNavigate();

  const COMPANY_ID = JSON.parse(
    localStorage.getItem("company_data")
  )?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hideZero, setHideZero] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {
    if (COMPANY_ID) loadBalanceSheet();
  }, [COMPANY_ID]);

  const loadBalanceSheet = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/report/balance-sheet/${COMPANY_ID}`
      );
      setData(res.data);
    } catch (err) {
      console.error("Balance Sheet Error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATES ================= */

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading Balance Sheet...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load Balance Sheet
      </div>
    );
  }

  /* ================= FILTER ================= */

  const assets = hideZero
    ? data.assets.filter((a) => Number(a.amount) !== 0)
    : data.assets;

  const liabilities = hideZero
    ? data.liabilities.filter((l) => Number(l.amount) !== 0)
    : data.liabilities;

  const difference =
    Number(data.totalAssets) -
    Number(data.totalLiabilities);

  /* ================= UI ================= */

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          Balance Sheet
        </h2>
        <p className="text-sm text-gray-500">
          As per Financial Year
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

      {/* WARNING */}
      {!data.isTallied && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-sm font-medium">
          ⚠️ Balance Sheet is NOT tallied
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ================= ASSETS ================= */}
        <div className="border rounded-lg overflow-hidden">
          <h3 className="bg-gray-100 px-4 py-2 font-semibold">
            Assets
          </h3>

          <table className="w-full text-sm">
            <tbody>
              {assets.length === 0 && (
                <tr>
                  <td
                    colSpan="2"
                    className="text-center py-4 text-gray-400"
                  >
                    No Assets
                  </td>
                </tr>
              )}

              {assets.map((a, i) => (
                <tr key={i}>
                  <td className="border px-3 py-2">
                    {a.ledger}
                  </td>
                  <td className="border px-3 py-2 text-right tabular-nums">
                    {Number(a.amount).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="font-semibold bg-gray-50">
                <td className="border px-3 py-2">
                  Total Assets
                </td>
                <td className="border px-3 py-2 text-right">
                  {Number(data.totalAssets).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================= LIABILITIES ================= */}
        <div className="border rounded-lg overflow-hidden">
          <h3 className="bg-gray-100 px-4 py-2 font-semibold">
            Liabilities
          </h3>

          <table className="w-full text-sm">
            <tbody>
              {liabilities.length === 0 && (
                <tr>
                  <td
                    colSpan="2"
                    className="text-center py-4 text-gray-400"
                  >
                    No Liabilities
                  </td>
                </tr>
              )}

              {liabilities.map((l, i) => (
                <tr
                  key={i}
                  className={
                    l.ledger === "Capital Account"
                      ? "bg-yellow-50 font-medium"
                      : ""
                  }
                >
                  <td className="border px-3 py-2">
                    {l.ledger}
                  </td>
                  <td className="border px-3 py-2 text-right tabular-nums">
                    {Number(l.amount).toFixed(2)}
                  </td>
                </tr>
              ))}

              <tr className="font-semibold bg-gray-50">
                <td className="border px-3 py-2">
                  Total Liabilities
                </td>
                <td className="border px-3 py-2 text-right">
                  {Number(data.totalLiabilities).toFixed(2)}
                </td>
              </tr>

              {!data.isTallied && (
                <tr className="bg-red-50 font-semibold">
                  <td className="border px-3 py-2">
                    Difference
                  </td>
                  <td className="border px-3 py-2 text-right">
                    {Math.abs(difference).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
