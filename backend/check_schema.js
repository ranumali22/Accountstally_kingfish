const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env" });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [columns] = await db.query("SHOW COLUMNS FROM third_party_voucher");
    console.log("COLUMNS FOR third_party_voucher:", columns);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await db.end();
  }
}

run();
