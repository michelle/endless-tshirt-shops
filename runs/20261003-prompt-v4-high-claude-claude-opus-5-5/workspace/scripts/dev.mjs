// Minimal local stand-in for Vercel: static files from public/, Web-standard
// handlers from api/, plus the /print rewrite from vercel.json.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

for (const line of existsSync('.env.local') ? readFileSync('.env.local', 'utf8').split('\n') : []) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
const port = +process.env.PORT || 3000;

http.createServer(async (req, res) => {
  let url = new URL(req.url, `http://localhost:${port}`);
  const pm = /^\/print\/(.+)$/.exec(url.pathname);
  if (pm) url = new URL(`/api/print?file=${pm[1]}`, url);
  if (url.pathname.startsWith('/api/')) {
    const mod = await import(path.resolve(`api/${url.pathname.slice(5)}.js`));
    const handler = mod[req.method];
    if (!handler) return res.writeHead(405).end();
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
    const out = await handler(request);
    res.writeHead(out.status, Object.fromEntries(out.headers));
    return res.end(Buffer.from(await out.arrayBuffer()));
  }
  let file = path.join('public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`http://localhost:${port}`));
