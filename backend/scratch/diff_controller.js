const fs = require("fs");
const path = require("path");

const filename = process.argv[2];
if (!filename) {
  console.log("Usage: node diff_controller.js <filename>");
  process.exit(1);
}

const localPath = path.join(__dirname, "../controllers", filename);
const livePath = path.join(__dirname, "../../livebackend/controllers", filename);

if (!fs.existsSync(localPath) || !fs.existsSync(livePath)) {
  console.log("One or both paths do not exist.");
  process.exit(1);
}

const localLines = fs.readFileSync(localPath, "utf-8").split(/\r?\n/);
const liveLines = fs.readFileSync(livePath, "utf-8").split(/\r?\n/);

console.log(`Comparing ${filename}...`);
console.log(`Local lines: ${localLines.length}, Live lines: ${liveLines.length}`);

const maxLines = Math.max(localLines.length, liveLines.length);
let diffCount = 0;

for (let i = 0; i < maxLines; i++) {
  const localLine = localLines[i] || "";
  const liveLine = liveLines[i] || "";

  if (localLine.trim() !== liveLine.trim()) {
    console.log(`Line ${i + 1}:`);
    console.log(`  Local: ${localLine}`);
    console.log(`  Live : ${liveLine}`);
    console.log("------------------------");
    diffCount++;
    if (diffCount >= 30) {
      console.log("Showing first 30 diffs. Exiting...");
      break;
    }
  }
}
if (diffCount === 0) {
  console.log("No differences found.");
}
