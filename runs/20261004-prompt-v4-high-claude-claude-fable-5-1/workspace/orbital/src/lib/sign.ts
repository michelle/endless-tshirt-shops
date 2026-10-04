import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.ART_SIGNING_SECRET;
  if (!s) throw new Error("ART_SIGNING_SECRET is not set");
  return s;
}

/** Short HMAC over the encoded design so only URLs we minted get rendered at print resolution. */
export function signDesign(encoded: string): string {
  return createHmac("sha256", secret()).update(encoded).digest("base64url").slice(0, 27);
}

export function verifyDesign(encoded: string, sig: string | null): boolean {
  if (!sig) return false;
  const expected = signDesign(encoded);
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function siteUrl(req?: Request): string {
  const env = process.env.SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (req) {
    const u = new URL(req.url);
    const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export type ArtVariant = "print" | "preview";

/** Public URL of a rendered PNG. `print` = full-resolution transparent file for Prodigi. */
export function artUrl(base: string, encoded: string, variant: ArtVariant): string {
  const q = new URLSearchParams({ d: encoded, sig: signDesign(encoded) });
  if (variant === "preview") { q.set("w", "900"); q.set("bg", "1"); }
  return `${base}/api/art?${q.toString()}`;
}
