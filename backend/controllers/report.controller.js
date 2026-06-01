const db = require("../config/db");
exports.balanceSheet = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [[company]] = await db.query(
      `SELECT financial_year_start, financial_year_end 
       FROM companies WHERE id = ?`,
      [companyId],
    );

    const [rows] = await db.query(
      `
SELECT
g.nature,
g.name AS group_name,
l.name,

(
CASE
WHEN l.opening_type='DR' THEN l.opening_balance
ELSE -l.opening_balance
END
+
CASE
WHEN g.nature IN ('ASSET','EXPENSE')
THEN IFNULL(SUM(e.debit),0) - IFNULL(SUM(e.credit),0)
ELSE
IFNULL(SUM(e.credit),0) - IFNULL(SUM(e.debit),0)
END
) AS balance

FROM ledgers l
JOIN groups_master g ON g.id=l.group_id

LEFT JOIN ledger_entries e
ON e.ledger_id=l.id
AND e.company_id=l.company_id
AND e.entry_date BETWEEN ? AND ?

WHERE l.company_id=?
AND g.nature IN ('ASSET','LIABILITY')

GROUP BY l.id,l.name,g.nature,g.name
      `,
      [company.financial_year_start, company.financial_year_end, companyId],
    );

    const [[pl]] = await db.query(
      `
 SELECT
SUM(
CASE WHEN g.nature='INCOME'
THEN IFNULL(e.credit,0)-IFNULL(e.debit,0)
ELSE 0 END
)
-
SUM(
CASE WHEN g.nature='EXPENSE'
THEN IFNULL(e.debit,0)-IFNULL(e.credit,0)
ELSE 0 END
) AS net_profit

FROM ledgers l
JOIN groups_master g ON g.id=l.group_id

LEFT JOIN ledger_entries e
ON e.ledger_id=l.id
AND e.company_id=l.company_id
AND e.entry_date BETWEEN ? AND ?

WHERE l.company_id=?
`,
      [company.financial_year_start, company.financial_year_end, companyId],
    );

    let assets = [],
      liabilities = [];
    let totalAssets = 0,
      totalLiabilities = 0;

    rows.forEach((r) => {
      let balance = Number(r.balance) || 0;

      // 🔥 ADD NET PROFIT TO CAPITAL
      if (r.group_name === "Capital Account") {
        balance += Number(pl?.net_profit || 0);
      }

      const amt = Math.abs(balance);

      if (r.nature === "ASSET") {
        if (balance >= 0) {
          assets.push({ ledger: r.name, amount: balance });
          totalAssets += balance;
        } else {
          liabilities.push({ ledger: r.name, amount: Math.abs(balance) });
          totalLiabilities += Math.abs(balance);
        }
      } else if (r.nature === "LIABILITY") {
        if (balance >= 0) {
          liabilities.push({ ledger: r.name, amount: balance });
          totalLiabilities += balance;
        } else {
          assets.push({ ledger: r.name, amount: Math.abs(balance) });
          totalAssets += Math.abs(balance);
        }
      }
    });

    // 🔥 If Net Loss → show in Asset side
    if (pl.net_profit < 0) {
      assets.push({
        ledger: "Net Loss",
        amount: Math.abs(pl.net_profit),
      });
      totalAssets += Math.abs(pl.net_profit);
    }

    res.json({
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      isTallied: totalAssets.toFixed(2) === totalLiabilities.toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.trialBalance = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [[company]] = await db.query(
      `SELECT financial_year_start, financial_year_end 
       FROM companies WHERE id = ?`,
      [companyId],
    );

    const [rows] = await db.query(
      `SELECT
l.id,
l.name,

(
CASE
WHEN l.opening_type = 'DR' THEN l.opening_balance
ELSE -l.opening_balance
END
+
IFNULL(SUM(e.debit),0)
-
IFNULL(SUM(e.credit),0)
) AS balance

FROM ledgers l

LEFT JOIN ledger_entries e
ON e.ledger_id = l.id
AND e.company_id = l.company_id
AND e.entry_date BETWEEN ? AND ?

WHERE l.company_id = ?

GROUP BY l.id, l.name
HAVING balance <> 0

ORDER BY l.name
`,
      [company.financial_year_start, company.financial_year_end, companyId],
    );

    res.json(
      rows.map((r) => ({
        ledger_id: r.id,
        ledger_name: r.name,
        debit: r.balance > 0 ? r.balance : 0,
        credit: r.balance < 0 ? Math.abs(r.balance) : 0,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.profitLoss = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [[company]] = await db.query(
      `SELECT financial_year_start, financial_year_end 
       FROM companies WHERE id = ?`,
      [companyId],
    );

    const [rows] = await db.query(
      `SELECT
g.nature,
l.name,

(
CASE
WHEN l.opening_type='DR' THEN l.opening_balance
ELSE -l.opening_balance
END
+
CASE
WHEN g.nature='INCOME'
THEN IFNULL(SUM(e.credit),0) - IFNULL(SUM(e.debit),0)
ELSE
IFNULL(SUM(e.debit),0) - IFNULL(SUM(e.credit),0)
END
) AS balance

FROM ledgers l
JOIN groups_master g ON g.id = l.group_id

LEFT JOIN ledger_entries e
ON e.ledger_id = l.id
AND e.company_id = l.company_id
AND e.entry_date BETWEEN ? AND ?

WHERE l.company_id = ?
AND g.nature IN ('INCOME','EXPENSE')

GROUP BY l.id,l.name,g.nature
`,
      [company.financial_year_start, company.financial_year_end, companyId],
    );

    let income = [],
      expense = [];
    let totalIncome = 0,
      totalExpense = 0;

    rows.forEach((r) => {
      const amt = Math.abs(r.balance);
      if (r.nature === "INCOME") {
        income.push({ ledger: r.name, amount: amt });
        totalIncome += amt;
      } else {
        expense.push({ ledger: r.name, amount: amt });
        totalExpense += amt;
      }
    });

    res.json({
      income,
      expense,
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.dayBook = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: "From date and To date required",
      });
    }

    // 🔹 Financial year check
    const [[company]] = await db.query(
      "SELECT financial_year_start, financial_year_end FROM companies WHERE id = ?",
      [companyId],
    );

    if (!company) {
      return res.status(400).json({ error: "Invalid company" });
    }

    if (
      from < company.financial_year_start ||
      to > company.financial_year_end
    ) {
      return res.status(400).json({
        error: "Date range outside financial year",
      });
    }

    // 🔹 Fetch vouchers with entries
    const [rows] = await db.query(
      `
      SELECT
        v.id AS voucher_id,
        v.voucher_date,
        v.voucher_type,
        CONCAT(v.voucher_prefix, '-', v.voucher_no) AS voucher_no,
        v.narration,

        l.name AS ledger_name,
        ve.debit,
        ve.credit

      FROM vouchers v
      JOIN voucher_entries ve ON ve.voucher_id = v.id
      JOIN ledgers l ON l.id = ve.party_id

      WHERE v.company_id = ?
    \
        AND v.voucher_date BETWEEN ? AND ?

      ORDER BY v.voucher_date, v.id, ve.id
      `,
      [companyId, from, to],
    );

    // 🔹 Group vouchers (Tally-style)
    const map = {};

    rows.forEach((r) => {
      if (!map[r.voucher_id]) {
        map[r.voucher_id] = {
          voucher_id: r.voucher_id,
          voucher_date: r.voucher_date,
          voucher_type: r.voucher_type,
          voucher_no: r.voucher_no,
          narration: r.narration,
          entries: [],
        };
      }

      map[r.voucher_id].entries.push({
        ledger: r.ledger_name,
        debit: r.debit,
        credit: r.credit,
      });
    });

    res.json(Object.values(map));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
