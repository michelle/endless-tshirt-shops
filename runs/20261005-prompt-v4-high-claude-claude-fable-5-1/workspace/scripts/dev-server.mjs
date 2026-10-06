// Local stand-in for Vercel: serves ./public statically (cleanUrls) and ./api/*.js as functions.
// Usage: node scripts/dev-server.mjs   (reads .env if present)
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}
const PORT = Number(process.env.PORT || 3000);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain' };

const rewrites = [[/^\/art\/([^/]+)\/([^/.]+)\.png$/, (m) => `/api/art?d=${m[1]}&sig=${m[2]}`]];

http.createServer(async (req, res) => {
  try {
    let url = new URL(req.url, `http://${req.headers.host}`);
    for (const [re, fn] of rewrites) {
      const m = url.pathname.match(re);
      if (m) { const extra = url.search ? '&' + url.search.slice(1) : ''; url = new URL(fn(m) + extra, url.origin); break; }
    }
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z0-9-]/g, '');
      const file = path.join(root, 'api', `${name}.js`);
      if (!existsSync(file)) { res.statusCode = 404; return res.end('no such function'); }
      const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`); // no caching in dev
      req.query = Object.fromEntries(url.searchParams.entries());
      req.url = url.pathname + url.search;
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (b) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); };
      res.send = (b) => res.end(b);
      return await mod.default(req, res);
    }
    // static
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    let file = path.join(root, 'public', p);
    if (!path.extname(file) && existsSync(file + '.html')) file += '.html';
    if (existsSync(file) && statSync(file).isFile() && file.startsWith(path.join(root, 'public'))) {
      res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
      return res.end(readFileSync(file));
    }
    res.statusCode = 404; res.end('not found');
  } catch (e) {
    console.error(e);
    res.statusCode = 500; res.end('server error: ' + e.message);
  }
}).listen(PORT, () => console.log(`dev server http://localhost:${PORT}`));
