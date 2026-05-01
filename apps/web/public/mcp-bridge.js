const https = require('https');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node mcp-bridge.js <sse-url>');
  process.exit(1);
}

let postUrl = null;
let pendingMessages = [];

// 1. Connect to SSE
const req = https.get(url, {
  headers: { 'Accept': 'text/event-stream' }
}, (res) => {
  let buffer = '';
  res.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data.startsWith('http')) {
          postUrl = data;
          // Kirim semua pesan yang tertunda saat koneksi baru buka
          while (pendingMessages.length > 0) {
            sendPost(pendingMessages.shift());
          }
        } else if (data) {
          // Kirim JSON murni ke Claude
          process.stdout.write(data + '\n');
        }
      }
    }
  });
});

req.on('error', (e) => {
  console.error(`Bridge Error: ${e.message}`);
  process.exit(1);
});

// 2. Listen to Stdin (from Claude)
process.stdin.on('data', (data) => {
  const message = data.toString();
  if (!postUrl) {
    pendingMessages.push(message);
  } else {
    sendPost(message);
  }
});

function sendPost(body) {
  const urlObj = new URL(postUrl);
  const postReq = https.request({
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  });
  postReq.on('error', (e) => console.error(`Post Error: ${e.message}`));
  postReq.write(body);
  postReq.end();
}
