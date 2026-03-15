import http from 'http';

const checkUrl = (url) => {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, content: data.slice(0, 500) }));
    }).on('error', (err) => resolve({ error: err.message }));
  });
};

async function run() {
  console.log("Checking Frontend (5173)...");
  const fe = await checkUrl('http://localhost:5173');
  console.log("Frontend Status:", fe.status || "ERROR", fe.error || "");
  console.log("Frontend Snippet:", fe.content || "N/A");

  console.log("\nChecking Backend (5000)...");
  const be = await checkUrl('http://localhost:5000/health');
  console.log("Backend Status:", be.status || "ERROR", be.error || "");
  console.log("Backend Snippet:", be.content || "N/A");
}

run();
