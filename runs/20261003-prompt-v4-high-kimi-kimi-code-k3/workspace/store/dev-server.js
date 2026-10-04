// Local dev server mimicking Vercel's routing: node dev-server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// load .env
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* no .env */ }

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };

  if (u.pathname.startsWith('/api/')) {
    const name = u.pathname.slice(5).replace(/\/$/, '');
    const file = path.join(__dirname, 'api', `${name}.js`);
    if (fs.existsSync(file)) {
      try {
        const handler = require(file);
        await handler(req, res);
      } catch (e) {
        console.error(e);
        if (!res.headersSent) res.status(500).json({ error: e.message });
      }
    } else {
      res.status(404).json({ error: 'not found' });
    }
    return;
  }

  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const file = path.join(__dirname, 'public', p);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('not found');
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`dev server on http://localhost:${port}`));
