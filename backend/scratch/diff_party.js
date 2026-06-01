const fs = require("fs");
const path = require("path");

const localPath = path.join(__dirname, "../controllers/party.controller.js");
const livePath = path.join(__dirname, "../../livebackend/controllers/party.controller.js");

const localLines = fs.readFileSync(localPath, "utf-8").split(/\r?\n/);
const liveLines = fs.readFileSync(livePath, "utf-8").split(/\r?\n/);

console.log(`Local lines: ${localLines.length}, Live lines: ${liveLines.length}`);

const maxLines = Math.max(localLines.length, liveLines.length);

for (let i = 0; i < maxLines; i++) {
  const localLine = localLines[i] || "";
  const liveLine = liveLines[i] || "";

  if (localLine.trim() !== liveLine.trim()) {
    console.log(`Line ${i + 1} differs:`);
    console.log(`  Local: ${localLine}`);
    console.log(`  Live : ${liveLine}`);
    console.log("------------------------");
  }
}
