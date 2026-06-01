const fs = require("fs");
const path = require("path");

const localPath = path.join(__dirname, "../controllers/voucher.controller.js");
const livePath = path.join(__dirname, "../../livebackend/controllers/voucher.controller.js");

const localContent = fs.readFileSync(localPath, "utf-8").split(/\r?\n/);
const liveContent = fs.readFileSync(livePath, "utf-8").split(/\r?\n/);

console.log("Local lines:", localContent.length);
console.log("Live lines:", liveContent.length);

const maxLines = Math.max(localContent.length, liveContent.length);
let diffCount = 0;

for (let i = 0; i < maxLines; i++) {
  const localLine = (localContent[i] || "").trim();
  const liveLine = (liveContent[i] || "").trim();

  if (localLine !== liveLine) {
    console.log(`Diff at line ${i + 1}:`);
    console.log(`  Local: ${localContent[i]}`);
    console.log(`  Live : ${liveContent[i]}`);
    console.log("------------------");
    diffCount++;
    if (diffCount > 30) {
      break;
    }
  }
}
