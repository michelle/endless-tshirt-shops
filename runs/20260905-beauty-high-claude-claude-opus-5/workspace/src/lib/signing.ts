import crypto from "node:crypto";

/**
 * Artwork URLs have to be publicly fetchable — Prodigi's printers pull them
 * over plain HTTP. A short HMAC keeps the endpoint from being used as a free
 * image renderer for arbitrary text while staying open to anyone with a link.
 */
const SECRET = process.env.ARTWORK_SECRET || process.env.STRIPE_SECRET_KEY || "datetime-store-dev";

export function sign(payload: string) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url").slice(0, 24);
}

export function verify(payload: string, signature: string | null) {
  if (!signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
