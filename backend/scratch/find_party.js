const fs = require("fs");
const sqlContent = fs.readFileSync("d:\\Ranu\\Tally\\tallyupdated\\tally_accounts_march_26_db (2).sql", "utf-8");

const lines = sqlContent.split("\n");

console.log("Searching for '422' in party table inserts:");
let foundParty = false;
let inPartyInsert = false;

lines.forEach((line) => {
  if (line.includes("INSERT INTO `party`")) {
    inPartyInsert = true;
  }
  if (inPartyInsert) {
    if (line.includes(";")) {
      inPartyInsert = false;
    }
    // Check if line contains (422,
    if (line.includes("(422,") || line.includes(", 422,")) {
      console.log(line);
      foundParty = true;
    }
  }
});

console.log("\nSearching for 'Adminstator Charges Payable' in party table inserts:");
inPartyInsert = false;
lines.forEach((line) => {
  if (line.includes("INSERT INTO `party`")) {
    inPartyInsert = true;
  }
  if (inPartyInsert) {
    if (line.includes(";")) {
      inPartyInsert = false;
    }
    if (line.toLowerCase().includes("adminstator")) {
      console.log(line);
    }
  }
});
