const fs = require("fs");
const content = fs.readFileSync("D:\\Ranu\\Tally\\tallyupdated\\livebackend\\controllers\\voucher.controller.js", "utf-8").split("\n");

for (let i = 185; i <= 225; i++) {
  console.log(`${i}: ${content[i - 1]}`);
}
