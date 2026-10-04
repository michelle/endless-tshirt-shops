import crypto from 'node:crypto';
import { normalizeName, normalizeWord, type DesignParams } from './design-svg';

// Secret used to sign design parameters. Override in production.
const SECRET = process.env.DESIGN_SECRET || 'resona-dev-secret-change-me';

function b64url(input: Buffer): string {
  return input.toString('base64url');
}

export function cleanParams(p: Partial<DesignParams>): DesignParams {
  return {
    name: normalizeName(String(p.name || '')),
    word: normalizeWord(String(p.word || '')),
    palette: String(p.palette || 'aurora').slice(0, 24),
    style: String(p.style || 'topo').slice(0, 24),
    shirt: String(p.shirt || 'black').slice(0, 24),
  };
}

/** Encode + sign design params into a compact, tamper-proof token. */
export function encodeParams(p: Partial<DesignParams>): string {
  const clean = cleanParams(p);
  const payload = b64url(Buffer.from(JSON.stringify(clean), 'utf8'));
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Verify a token and return the params, or null if invalid. */
export function verifyToken(token: string | null | undefined): DesignParams | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return cleanParams(parsed);
  } catch {
    return null;
  }
}
