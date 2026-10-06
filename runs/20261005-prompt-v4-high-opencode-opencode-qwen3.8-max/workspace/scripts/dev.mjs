// Local dev server mirroring the Vercel deployment: serves public/ statically
// and runs api/*.js as (req, res) functions with raw request bodies.
//   node scripts/dev.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || process.env.PORT || 3000);

// load .env
if (existsSync(join(root, '.env'))) {
  const { readFileSync } = await import('node:fs');
  for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf',
  '.json': 'application/json', '.ico': 'image/x-icon',
};

const fnCache = new Map();
async function loadFn(name) {
  if (!fnCache.has(name)) {
    const mod = await import(pathToFileURL(join(root, 'api', `${name}.js`)).href + `?t=${Date.now()}`);
    fnCache.set(name, mod.default);
  }
  return fnCache.get(name);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
    const file = join(root, 'api', `${name}.js`);
    if (!existsSync(file)) { res.statusCode = 404; return res.end('no such endpoint'); }
    try {
      const fn = await loadFn(name);
      await fn(req, res);
    } catch (e) {
      if (!res.headersSent) res.statusCode = 500;
      res.end(`server error: ${e.stack}`);
    }
    return;
  }
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  path = path.replace(/\.\./g, '');
  const file = join(root, 'public', path);
  try {
    const st = await stat(file);
    if (st.isDirectory()) throw new Error('dir');
    const body = await readFile(file);
    res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.statusCode = 200;
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});

server.listen(port, () => console.log(`Heliogram dev server on http://localhost:${port}`));
