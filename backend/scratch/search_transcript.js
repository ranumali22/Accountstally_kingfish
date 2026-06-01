const fs = require('fs');
const readline = require('readline');

async function searchTranscript() {
  const fileStream = fs.createReadStream('C:/Users/Deependra/.gemini/antigravity/brain/50b36e63-5c68-46b7-aa37-a095db42b6e8/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.toLowerCase().includes('party.controller.js')) {
      console.log(`Line ${lineCount}: ${line.slice(0, 300)}...`);
    }
  }
}

searchTranscript();
