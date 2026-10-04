// Local dev server mirroring Vercel's routing: /api/* -> functions, else public/.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'public');
const API = path.join(__dirname, 'api');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function apiFileFor(pathname) {
  // /api/design -> api/design.js ; /api/preview/XYZ -> api/preview/[token].js
  const rel = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  const parts = rel.split('/');
  let dir = API;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const isLast = i === parts.length - 1;
    const direct = path.join(dir, p + (isLast ? '.js' : ''));
    if (isLast && fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
    const dyn = path.join(dir, `[${p === '' ? 'token' : 'token'}].js`);
    if (isLast && fs.existsSync(path.join(dir, '[token].js'))) return path.join(dir, '[token].js');
    const subdir = path.join(dir, p);
    if (!isLast && fs.existsSync(subdir) && fs.statSync(subdir).isDirectory()) { dir = subdir; continue; }
    if (isLast) {
      // dynamic segment file in current dir?
      const candidates = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.startsWith('[') && f.endsWith('].js')) : [];
      if (candidates.length) return path.join(dir, candidates[0]);
    }
    return null;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  if (url.pathname.startsWith('/api/')) {
    const file = apiFileFor(url.pathname);
    if (!file) { res.writeHead(404); res.end('no route'); return; }
    delete require.cache[require.resolve(file)];
    const handler = require(file);
    try {
      await handler(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  let fp = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) fp = path.join(ROOT, 'index.html');
  const ext = path.extname(fp);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

server.listen(process.env.PORT || 3000, () => console.log(`nocturne dev server on :${process.env.PORT || 3000}`));
