/**
 * HMAC-signed, stateless print URLs. The spec itself travels in the URL (it
 * is tiny and contains nothing sensitive), so any server can regenerate the
 * exact print file years from now without a database.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.SKYBORN_SIGNING_SECRET;
  if (!s || s.length < 16) throw new Error("SKYBORN_SIGNING_SECRET is not configured");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signSpec(encoded: string): { p: string; s: string } {
  const p = b64url(Buffer.from(encoded, "utf8"));
  const s = b64url(createHmac("sha256", secret()).update(p).digest());
  return { p, s };
}

export function verifySpec(p: string, s: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(p) || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const expected = b64url(createHmac("sha256", secret()).update(p).digest());
  const a = Buffer.from(s), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return fromB64url(p).toString("utf8");
}

export function printUrl(origin: string, encoded: string): string {
  const { p, s } = signSpec(encoded);
  return `${origin}/api/print?p=${p}&s=${s}`;
}
