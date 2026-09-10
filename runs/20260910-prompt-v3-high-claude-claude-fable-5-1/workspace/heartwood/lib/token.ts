import { createHmac, timingSafeEqual } from "node:crypto";
import { Design, decodeDesignParam, encodeDesignParam, DesignError } from "./rings";

/**
 * Signed design tokens. The print and preview endpoints only render designs that were
 * signed by our checkout endpoint, so nobody can use our renderer as a free image farm
 * or slip a different design into a Prodigi order.
 */

function secret(): string {
  const s = process.env.DESIGN_SECRET;
  if (!s) throw new Error("DESIGN_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 32);
}

export function signDesign(d: Design): string {
  const payload = encodeDesignParam(d);
  return `${payload}.${sign(payload)}`;
}

export function verifyDesignToken(token: string): Design {
  const dot = token.lastIndexOf(".");
  if (dot < 1) throw new DesignError("Malformed token");
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new DesignError("Bad signature");
  return decodeDesignParam(payload);
}

/** Stripe metadata values max out at 500 chars; split long strings across keys. */
export function putChunked(meta: Record<string, string>, key: string, value: string, size = 450): void {
  let i = 0;
  for (let pos = 0; pos < value.length; pos += size) {
    meta[`${key}${i++}`] = value.slice(pos, pos + size);
  }
  meta[`${key}n`] = String(i);
}

export function getChunked(meta: Record<string, string> | null | undefined, key: string): string | null {
  if (!meta) return null;
  const n = Number(meta[`${key}n`]);
  if (!Number.isFinite(n) || n < 1) return null;
  let out = "";
  for (let i = 0; i < n; i++) {
    const part = meta[`${key}${i}`];
    if (part === undefined) return null;
    out += part;
  }
  return out;
}
