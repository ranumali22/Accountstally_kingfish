const db = require("../config/db");

async function checkTriggers() {
  try {
    const [triggers] = await db.query("SHOW TRIGGERS");
    console.log("Database Triggers:");
    console.log(JSON.stringify(triggers, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTriggers();
