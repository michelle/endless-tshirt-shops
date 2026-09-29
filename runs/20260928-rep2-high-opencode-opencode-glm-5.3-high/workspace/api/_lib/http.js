// Shared request/response helpers for the API functions.

export async function readRawBody(req, limitBytes = 5 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new BodyTooLarge();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export class BodyTooLarge extends Error {
  constructor() {
    super('request body too large');
  }
}

export async function readJsonBody(req, limitBytes = 64 * 1024) {
  const raw = await readRawBody(req, limitBytes);
  if (!raw.length) return null;
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return null;
  }
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function requestBase(req) {
  const host = req.headers.host;
  if (!host) return null;
  const proto =
    req.headers['x-forwarded-proto'] || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function log(obj) {
  // Vercel captures stdout into the function logs.
  console.log(JSON.stringify({ t: new Date().toISOString(), ...obj }));
}
