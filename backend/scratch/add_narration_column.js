const db = require("../config/db");

async function updateTable() {
  try {
    console.log("Checking for narration column in tax_duties...");
    const [columns] = await db.query("SHOW COLUMNS FROM tax_duties LIKE 'narration'");
    
    if (columns.length === 0) {
      console.log("Adding narration column to tax_duties...");
      await db.query("ALTER TABLE tax_duties ADD COLUMN narration TEXT AFTER transaction_date");
      console.log("Column added successfully.");
    } else {
      console.log("Narration column already exists.");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Error updating table:", err);
    process.exit(1);
  }
}

updateTable();
