// Serves a folder under /rasd/ like GitHub Pages. ROOT can be switched at runtime via /__root?d=<dir>
const http = require('http'), fs = require('fs'), path = require('path');
let ROOT = process.argv[2];
const T = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (u.pathname === '/__root') { ROOT = u.searchParams.get('d'); s.end('ok ' + ROOT); return; }
  if (!u.pathname.startsWith('/rasd/')) { s.writeHead(404); s.end('404'); return; }
  let p = decodeURIComponent(u.pathname.slice(6)) || 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end('404'); return; } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' }); s.end(b); });
}).listen(8765, () => console.log('listening'));
