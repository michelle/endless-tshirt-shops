// Tiny helpers so handlers run unchanged on Vercel and on the local dev server.
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export const query = (req) => Object.fromEntries(new URL(req.url, 'http://x').searchParams);

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (Buffer.isBuffer(body)) return res.end(body);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function methodGuard(req, res, method) {
  if (req.method === method) return true;
  send(res, 405, { error: 'Method not allowed' }, { Allow: method });
  return false;
}
