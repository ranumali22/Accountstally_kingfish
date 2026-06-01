const fs = require("fs");
const path = require("path");

const controllersDir = "D:\\Ranu\\Tally\\tallyupdated\\livebackend\\controllers";

fs.readdirSync(controllersDir).forEach((file) => {
  if (!file.endsWith(".js")) return;
  const filePath = path.join(controllersDir, file);
  const content = fs.readFileSync(filePath, "utf-8");

  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes("insert into ledger_entries")) {
      console.log(`File: ${file}, Line: ${index + 1}`);
      // Print the insert query and the values array
      for (let i = -2; i <= 25; i++) {
        const currLine = lines[index + i];
        if (currLine !== undefined) {
          console.log(`  [${index + 1 + i}]: ${currLine}`);
        }
      }
      console.log("=====================================\n");
    }
  });
});
