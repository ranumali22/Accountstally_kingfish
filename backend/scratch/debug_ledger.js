const db = require("../config/db");

async function debugLedger() {
  try {
    const [rows] = await db.query(`
      SELECT id, company_id, source_type, source_id, ledger_id, party_id, debit, credit
      FROM ledger_entries
      WHERE source_type IN ('RECEIPT', 'PAYMENT')
      LIMIT 10
    `);
    console.log("Found rows:", rows);
    
    const [ledgers] = await db.query(`
      SELECT id, company_id, party_id, name FROM ledgers LIMIT 5
    `);
    console.log("Sample ledgers:", ledgers);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugLedger();
