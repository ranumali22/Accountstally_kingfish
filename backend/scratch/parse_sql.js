const fs = require("fs");
const path = require("path");

const sqlPath = "d:\\Ranu\\Tally\\tallyupdated\\tally_accounts_march_26_db (2).sql";
const content = fs.readFileSync(sqlPath, "utf-8");

console.log("File length:", content.length);

const triggerMatches = content.match(/trigger/i);
console.log("Trigger keyword match:", triggerMatches);

const createMatches = content.match(/CREATE/gi);
console.log("CREATE keyword matches count:", createMatches ? createMatches.length : 0);

// Search for any CREATE TRIGGER statements
const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.toLowerCase().includes("trigger")) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
