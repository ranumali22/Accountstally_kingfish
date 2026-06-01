const db = require("../config/db");

async function test() {
  try {
    const [companies] = await db.query("SELECT id, name FROM companies");
    console.log("Companies:", companies);

    const [banks] = await db.query("SELECT id, company_id, bank_name, opening_balance, balance_type FROM banks_master");
    console.log("Banks:", banks);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
