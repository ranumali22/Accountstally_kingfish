const fs = require("fs");
const sqlContent = fs.readFileSync("d:/Ranu/Tally/tallyupdated/tally_accounts_march_26_db (2).sql", "utf-8");

const lines = sqlContent.split("\n");

console.log("Searching for 'KNP/25-26137':");
lines.forEach((line, index) => {
  if (line.includes("KNP/25-26137")) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
