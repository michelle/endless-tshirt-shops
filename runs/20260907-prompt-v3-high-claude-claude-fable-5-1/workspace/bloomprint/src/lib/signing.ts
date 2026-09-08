import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Design, decodeDesign, encodeDesign } from "./design";

function secret(): string {
  const s = process.env.PRINT_ASSET_SECRET;
  if (!s || s.length < 16) throw new Error("PRINT_ASSET_SECRET is not configured");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Token that lets anyone holding it render this exact design as a PNG.
 * Used for Stripe's product image and as the asset URL Prodigi downloads.
 */
export function signDesign(design: Design): string {
  const payload = encodeDesign(design);
  return `${payload}.${sign(payload)}`;
}

export function verifyDesignToken(token: string): Design | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  return decodeDesign(payload);
}
