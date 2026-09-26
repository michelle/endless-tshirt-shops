/**
 * HMAC-signed stateless tokens.
 *
 * We don't run a database in this sandbox build, so an order travels
 * through checkout as a tamper-proof signed token: the server signs it at
 * creation, and only a validly-signed token can trigger payment capture or
 * Prodigi fulfilment. (Production note: pair this with a real order store.)
 */
import crypto from 'node:crypto';

function getSecret(): string {
  const s = process.env.ORDER_SIGNING_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ORDER_SIGNING_SECRET must be set in production');
    }
    return 'dev-only-insecure-signing-secret';
  }
  return s;
}

function hmac(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function signToken(obj: object): string {
  const payload = Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

export function verifyToken<T>(token: string, maxAgeHours = 72): T | null {
  if (typeof token !== 'string' || token.length > 8192) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let obj: T;
  try {
    obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
  const issued = (obj as { issuedAt?: number }).issuedAt;
  if (typeof issued === 'number') {
    if (issued > Date.now() + 60_000) return null;
    if (Date.now() - issued > maxAgeHours * 3600_000) return null;
  }
  return obj;
}
