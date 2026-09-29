// HMAC signing for artwork URLs so the render endpoint can't be abused to
// render arbitrary (unpaid or hostile) designs.

import crypto from "node:crypto";

function secret(): string {
  const s = process.env.ARTWORK_SECRET;
  if (!s) throw new Error("ARTWORK_SECRET is not configured");
  return s;
}

export function signPayload(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function verifyPayload(payload: string, sig: string): boolean {
  const expected = signPayload(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
