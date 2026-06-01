const fs = require("fs");
const sqlPath = "d:\\Ranu\\Tally\\tallyupdated\\tally_accounts_march_26_db (2).sql";
const content = fs.readFileSync(sqlPath, "utf-8");

const lines = content.split("\n");
lines.forEach((line, index) => {
  if (line.toLowerCase().includes("create table")) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
