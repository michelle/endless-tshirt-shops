import crypto from "node:crypto";

function secret() {
  const s = process.env.PRINT_SIGNING_SECRET;
  if (!s) throw new Error("PRINT_SIGNING_SECRET is not set");
  return s;
}

/** HMAC so only server-issued print URLs trigger full-resolution renders. */
export function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url").slice(0, 32);
}

export function verify(value: string, sig: string) {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(sig || "");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
