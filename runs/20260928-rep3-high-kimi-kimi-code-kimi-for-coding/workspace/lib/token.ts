// HMAC-signed design tokens. The token binds every parameter that affects the
// print (design + size + color) so the Prodigi asset URL and Stripe metadata
// can't be tampered with between checkout and fulfilment.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { DesignTokenPayload } from "./design-input";
import { DARK_SHIRT_COLORS } from "./design-input";

function secret(): string {
  const s = process.env.DESIGN_SIGNING_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    console.warn("DESIGN_SIGNING_SECRET not set — using an ephemeral secret (tokens invalidate on cold start).");
  }
  return "meridian-dev-secret-do-not-use-in-prod";
}

const b64u = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const unb64u = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export function signDesign(d: Omit<DesignTokenPayload, "v" | "dark">): string {
  const payload: DesignTokenPayload = {
    ...d,
    v: 1,
    dark: DARK_SHIRT_COLORS.has(d.color),
  };
  const body = b64u(JSON.stringify(payload));
  const sig = b64u(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyDesign(token: string): DesignTokenPayload | null {
  const m = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  const expect = createHmac("sha256", secret()).update(m[1]).digest();
  const got = unb64u(m[2]);
  if (expect.length !== got.length || !timingSafeEqual(expect, got)) return null;
  try {
    const obj = JSON.parse(unb64u(m[1]).toString("utf8")) as DesignTokenPayload;
    if (obj.v !== 1) return null;
    return obj;
  } catch {
    return null;
  }
}
