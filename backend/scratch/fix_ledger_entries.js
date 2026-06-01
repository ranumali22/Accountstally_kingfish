const db = require("../config/db");

async function fixDebitNotes() {
  try {
    console.log("Fixing ledger_id for DEBIT_NOTE entries...");
    const [result] = await db.query(`
      UPDATE ledger_entries le
      JOIN ledgers l ON l.party_id = le.party_id AND l.company_id = le.company_id
      SET le.ledger_id = l.id
      WHERE le.source_type = 'DEBIT_NOTE' AND le.ledger_id = le.party_id
    `);
    console.log(`Successfully fixed ${result.affectedRows} debit note ledger entry rows!`);
    process.exit(0);
  } catch (error) {
    console.error("Error during DB fix:", error);
    process.exit(1);
  }
}

fixDebitNotes();
