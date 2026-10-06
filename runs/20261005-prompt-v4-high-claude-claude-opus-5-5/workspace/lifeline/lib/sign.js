// Signed, self-describing print-file URLs. The design travels in the URL itself, so
// Prodigi can fetch the artwork at any time without us needing a database.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64url');

function mac(payload) {
  if (!config.signingSecret) throw new Error('No signing secret configured');
  return createHmac('sha256', config.signingSecret).update(payload).digest('base64url').slice(0, 32);
}

export function printUrl(base, design, shirt, { preview = false } = {}) {
  const d = b64url(JSON.stringify(design));
  const payload = `${d}.${shirt}`;
  const q = new URLSearchParams({ d, shirt, sig: mac(payload) });
  if (preview) q.set('preview', '1');
  return `${base}/api/print?${q}`;
}

export function verifyPrintParams({ d, shirt, sig }) {
  if (!d || !shirt || !sig) return null;
  const expected = Buffer.from(mac(`${d}.${shirt}`));
  const given = Buffer.from(String(sig));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(d, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
