// Self-contained signed URLs: the design travels inside the URL (HMAC-signed),
// so print/preview links keep working even across restarts or a new tunnel URL.

import crypto from 'node:crypto';

export function mintSignedParams(payload, secret) {
  const d = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(d).digest('base64url');
  return { d, sig };
}

export function verifySignedParams(d, sig, secret) {
  if (!d || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(String(d)).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(String(d), 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
