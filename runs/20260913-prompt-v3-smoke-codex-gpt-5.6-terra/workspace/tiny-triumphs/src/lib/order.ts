import { createHmac, timingSafeEqual } from "crypto";

export const PRODUCT_SKU = "GLOBAL-TEE-BC-3001";
export const allowedColors = ["cream", "black", "white"] as const;
export const allowedBadges = ["spark", "sun", "rocket", "wave"] as const;
export const allowedSizes = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;

export type Customization = { moment: string; name: string; badge: string; color: string; size: string };

export function cleanCustomization(input: unknown): Customization | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const moment = typeof data.moment === "string" ? data.moment.trim().replace(/\s+/g, " ") : "";
  const name = typeof data.name === "string" ? data.name.trim().replace(/\s+/g, " ").toUpperCase() : "";
  const badge = typeof data.badge === "string" ? data.badge : "";
  const color = typeof data.color === "string" ? data.color : "";
  const size = typeof data.size === "string" ? data.size : "";
  if (!moment || moment.length > 42 || !name || name.length > 18 || !allowedBadges.includes(badge as never) || !allowedColors.includes(color as never) || !allowedSizes.includes(size as never)) return null;
  return { moment, name, badge, color, size };
}

export function designPayload(design: Pick<Customization, "moment" | "name" | "badge" | "color">) {
  return `${design.moment}\n${design.name}\n${design.badge}\n${design.color}`;
}

export function signDesign(design: Pick<Customization, "moment" | "name" | "badge" | "color">) {
  const secret = process.env.DESIGN_SIGNING_SECRET;
  if (!secret) throw new Error("DESIGN_SIGNING_SECRET is not configured.");
  return createHmac("sha256", secret).update(designPayload(design)).digest("hex");
}

export function verifyDesignSignature(design: Pick<Customization, "moment" | "name" | "badge" | "color">, signature: string) {
  const expected = signDesign(design);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function buildPrintUrl(origin: string, design: Pick<Customization, "moment" | "name" | "badge" | "color">) {
  const params = new URLSearchParams({ ...design, sig: signDesign(design) });
  return `${origin}/api/print-design?${params.toString()}`;
}
