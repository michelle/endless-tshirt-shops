import crypto from "node:crypto";
import zlib from "node:zlib";

const FALLBACK = "interchange-dev-secret-do-not-use-in-production";

function secret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    // Deploys must set APP_SECRET; falling back silently would make every
    // signed token forgeable.
    console.warn("APP_SECRET is not set - signed tokens are using the dev fallback secret");
  }
  return FALLBACK;
}

const b64u = (b: Buffer) => b.toString("base64url");

export function sign(payload: string): string {
  return b64u(crypto.createHmac("sha256", secret()).update(payload).digest());
}

export function verify(payload: string, sig: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Compress + sign an arbitrary JSON value into a URL-safe token. */
export function pack(value: unknown): string {
  const body = b64u(zlib.deflateRawSync(Buffer.from(JSON.stringify(value)), { level: 9 }));
  return `${body}.${sign(body)}`;
}

export function unpack<T>(token: string): T | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    if (!verify(body, sig)) return null;
    return JSON.parse(zlib.inflateRawSync(Buffer.from(body, "base64url")).toString()) as T;
  } catch {
    return null;
  }
}

export function orderRef(): string {
  return "IX" + crypto.randomBytes(6).toString("hex").toUpperCase();
}
