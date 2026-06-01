const db = require("../config/db");

async function checkAll() {
  try {
    const [sourceTypes] = await db.query(`SELECT DISTINCT source_type FROM ledger_entries`);
    console.log("Distinct source types in ledger_entries:", sourceTypes);
    
    const [vouchers] = await db.query(`SELECT * FROM vouchers LIMIT 5`);
    console.log("Sample vouchers:", vouchers);

    const [entries] = await db.query(`SELECT * FROM ledger_entries LIMIT 5`);
    console.log("Sample ledger_entries:", entries);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAll();
