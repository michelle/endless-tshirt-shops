// 4000 Fridays — HMAC-signed design payloads.
//
// Prodigi downloads the print file from a public URL. We hand it
// ${SITE_BASE_URL}/api/print-file?d=<payload>&s=<hmac> where the payload is
// the base64url compact design JSON and s proves we minted it (no public
// writes, no blob storage, fully deterministic regeneration).

import * as crypto from "node:crypto";

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) {
    throw new Error("APP_SECRET must be set (>= 16 chars)");
  }
  return s;
}

export function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

export function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

export function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function verify(payload: string, sig: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig ?? ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function md5(buf: Buffer): string {
  return crypto.createHash("md5").update(buf).digest("hex");
}
