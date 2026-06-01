const fs = require("fs");
const path = require("path");

const localDir = path.join(__dirname, "../controllers");
const liveDir = path.join(__dirname, "../../livebackend/controllers");

function normalizeContent(content) {
  return content.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function compareFiles() {
  const localFiles = fs.readdirSync(localDir);
  const liveFiles = fs.readdirSync(liveDir);

  console.log(`Local controllers count: ${localFiles.length}`);
  console.log(`Live controllers count: ${liveFiles.length}`);

  const allFiles = Array.from(new Set([...localFiles, ...liveFiles])).filter(f => f.endsWith(".js"));

  for (const file of allFiles) {
    const localPath = path.join(localDir, file);
    const livePath = path.join(liveDir, file);

    const localExists = fs.existsSync(localPath);
    const liveExists = fs.existsSync(livePath);

    if (!localExists) {
      console.log(`[ONLY IN LIVE]: ${file}`);
      continue;
    }
    if (!liveExists) {
      console.log(`[ONLY IN LOCAL]: ${file}`);
      continue;
    }

    const localContent = fs.readFileSync(localPath, "utf-8");
    const liveContent = fs.readFileSync(livePath, "utf-8");

    const normLocal = normalizeContent(localContent);
    const normLive = normalizeContent(liveContent);

    if (normLocal !== normLive) {
      console.log(`[CODE DIFFERENCE]: ${file}`);
    }
  }
}

compareFiles();
