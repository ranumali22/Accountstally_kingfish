const fs = require("fs");
const path = require("path");

const localPath = path.join(__dirname, "../controllers/voucher.controller.js");
const livePath = path.join(__dirname, "../../livebackend/controllers/voucher.controller.js");

const localLines = fs.readFileSync(localPath, "utf-8").split("\n");
const liveLines = fs.readFileSync(livePath, "utf-8").split("\n");

console.log("Local insertions of ledger_entries:");
localLines.forEach((line, index) => {
  if (line.includes("ledger_id") && localLines[index + 1]?.includes("party_id")) {
    console.log(`Line ${index + 1}: ${line}`);
    console.log(`Line ${index + 2}: ${localLines[index + 1]}`);
    // Print around this area
    for (let i = -5; i <= 5; i++) {
      console.log(`  [${index + 1 + i}]: ${localLines[index + i]}`);
    }
    console.log("------------------");
  }
});

console.log("\n=====================================\n");

console.log("Live insertions of ledger_entries:");
liveLines.forEach((line, index) => {
  if (line.includes("ledger_id") && liveLines[index + 1]?.includes("party_id")) {
    console.log(`Line ${index + 1}: ${line}`);
    console.log(`Line ${index + 2}: ${liveLines[index + 1]}`);
    // Print around this area
    for (let i = -5; i <= 5; i++) {
      console.log(`  [${index + 1 + i}]: ${liveLines[index + i]}`);
    }
    console.log("------------------");
  }
});
