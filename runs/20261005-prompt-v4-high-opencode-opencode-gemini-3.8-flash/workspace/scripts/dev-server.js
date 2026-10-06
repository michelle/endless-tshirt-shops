'use strict';
// Tiny local server that runs the Vercel-style handlers plus /public static.
// For development only; not deployed.
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const handlers = {
  '/api/checkout': require('../api/checkout'),
  '/api/order': require('../api/order'),
  '/api/design': require('../api/design'),
  '/api/health': require('../api/health'),
  '/api/sandbox-order': require('../api/sandbox-order'),
  '/api/track': require('../api/track'),
  '/api/webhook': require('../api/webhook'),
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (o) => {
    if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(o));
  };
  res.send = (b) => res.end(b);

  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', async () => {
    req.query = u.query;
    if (body) {
      try {
        req.body = JSON.parse(body);
      } catch {
        req.body = body;
      }
    }
    const h = handlers[u.pathname];
    if (h) {
      try {
        await h(req, res);
      } catch (e) {
        res.statusCode = 500;
        res.end(String(e && e.stack));
      }
      return;
    }
    let p = u.pathname === '/' ? '/index.html' : u.pathname;
    let fp = path.join(__dirname, '..', 'public', path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!fs.existsSync(fp) && fs.existsSync(fp + '.html')) fp += '.html';
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.setHeader('content-type', TYPES[path.extname(fp)] || 'application/octet-stream');
      res.end(fs.readFileSync(fp));
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
});

const port = process.env.PORT || 4311;
server.listen(port, () => console.log(`dev server on http://localhost:${port}`));
