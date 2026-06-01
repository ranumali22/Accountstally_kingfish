const db = require("../config/db");

async function checkDues() {
  try {
    const id = 2; // Moolchand
    const company_id = 8;

    const [[ledger]] = await db.execute(
      `SELECT id FROM ledgers WHERE party_id = ? AND company_id = ? LIMIT 1`,
      [id, company_id]
    );
    const ledger_id = ledger?.id || 0;
    console.log("Ledger ID for Moolchand:", ledger_id);

    const [rows] = await db.execute(
      `
      SELECT
        COALESCE(SUM(debit),0) - COALESCE(SUM(credit),0) AS sales_due
      FROM ledger_entries
      WHERE company_id = ?
        AND (
          ledger_id = ?
          OR (ledger_id = ? AND party_id = ?)
        )
    `,
      [company_id, ledger_id, id, id],
    );
    console.log("getPartyDues result:", rows[0]);

    // Let's also check all ledger entries matching the filter
    const [entries] = await db.execute(
      `
      SELECT id, source_id, ledger_id, party_id, debit, credit
      FROM ledger_entries
      WHERE company_id = ?
        AND (
          ledger_id = ?
          OR (ledger_id = ? AND party_id = ?)
        )
      `,
      [company_id, ledger_id, id, id]
    );
    console.log("Matching entries:", entries);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDues();
