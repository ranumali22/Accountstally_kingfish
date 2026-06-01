const fs = require("fs");
const localContent = fs.readFileSync("D:\\Ranu\\Tally\\tallyupdated\\backend\\controllers\\voucher.controller.js", "utf-8").replace(/\r\n/g, "\n");
const liveContent = fs.readFileSync("D:\\Ranu\\Tally\\tallyupdated\\livebackend\\controllers\\voucher.controller.js", "utf-8").replace(/\r\n/g, "\n");

console.log("Normalized Local length:", localContent.length);
console.log("Normalized Live length:", liveContent.length);

if (localContent === liveContent) {
  console.log("Normalized files are EXACTLY identical!");
} else {
  console.log("Normalized files differ!");
  const minLen = Math.min(localContent.length, liveContent.length);
  for (let i = 0; i < minLen; i++) {
    if (localContent[i] !== liveContent[i]) {
      console.log(`First difference at character index ${i}:`);
      console.log(`Local: ${JSON.stringify(localContent.substring(i, i + 50))}`);
      console.log(`Live : ${JSON.stringify(liveContent.substring(i, i + 50))}`);
      break;
    }
  }
}
