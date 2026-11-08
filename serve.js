// Tiny zero-dependency static server for local development: `npm start`
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT) || 8089;
const root = __dirname;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(root, urlPath));
  // Block path traversal outside the project folder
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Chrono-FSM running at http://127.0.0.1:${port}/`);
});