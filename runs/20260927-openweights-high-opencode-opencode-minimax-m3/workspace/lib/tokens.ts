// Tiny signed-token helper so we can carry customization state across the
// Stripe-hosted checkout round trip and the webhook. Not a substitute for a
// database at scale; we set `paymentIntent.metadata` as the source of truth
// in production. This is the fallback when metadata is missing.
//
// Format: base64url(JSON).base64url(hmac_sha256(json, secret))
import crypto from "node:crypto";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function secret(): string {
  return process.env.GNOMON_TOKEN_SECRET || process.env.STRIPE_SECRET_KEY || "gnomon-dev-secret-do-not-use-in-prod";
}

export function sign(value: unknown): string {
  const json = JSON.stringify(value);
  const body = b64url(Buffer.from(json, "utf8"));
  const sig = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verify<T = unknown>(token: string): T | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  )
    return null;
  try {
    return JSON.parse(b64urlDecode(body).toString("utf8")) as T;
  } catch {
    return null;
  }
}
