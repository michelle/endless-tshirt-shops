// Node server: serves public/ and routes /api/* to the platform-neutral handlers.
// Used for local dev and for self-hosting (e.g. behind a Cloudflare Tunnel).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const port = Number(process.env.PORT || 3000);
const ROUTES = new Set(['checkout', 'order', 'print', 'shipping', 'stripe-webhook']);

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    if (pathname.startsWith('/api/')) {
      const name = pathname.slice(5);
      if (!ROUTES.has(name)) throw Object.assign(new Error('no route'), { code: 'ENOENT' });
      const mod = await import(`../api/${name}.js`);
      return await mod.default(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw Object.assign(new Error('no route'), { code: 'ENOENT' });
    const file = path.join(ROOT, 'public', pathname === '/' ? 'index.html' : path.normalize(pathname));
    const data = await readFile(file);
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch (e) {
    const missing = e.code === 'ENOENT' || e.code === 'EISDIR' || e.code === 'ERR_MODULE_NOT_FOUND';
    if (!missing) console.error(e);
    if (res.headersSent) return res.end();
    res.statusCode = missing ? 404 : 500;
    res.end(missing ? 'Not found' : 'Server error');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
