import "server-only";
import crypto from "node:crypto";
import { decodeDesign, encodeDesign, type Design } from "./design";
import { env } from "./env";

// Artwork URLs embed the whole design plus an HMAC, so the print file can be
// regenerated deterministically at any time without storing images anywhere.

function sig(payload: string): string {
  return crypto.createHmac("sha256", env.signingSecret()).update(payload).digest("base64url").slice(0, 32);
}

export function signDesign(design: Design): string {
  const token = encodeDesign(design);
  return `${token}.${sig(token)}`;
}

export function verifyDesignToken(signed: string): Design | null {
  const [token, s] = signed.replace(/\.png$/, "").split(".");
  if (!token || !s) return null;
  const expected = sig(token);
  if (s.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  try {
    return decodeDesign(token);
  } catch {
    return null;
  }
}

export const printUrl = (design: Design) => `${env.siteUrl()}/api/print/${signDesign(design)}.png`;
export const previewUrl = (design: Design) => `${env.siteUrl()}/api/preview/${signDesign(design)}.png`;
