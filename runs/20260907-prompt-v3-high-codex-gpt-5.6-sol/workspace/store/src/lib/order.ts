import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const orderSchema = z.object({
  place: z.string().trim().min(2).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phrase: z.string().trim().min(2).max(48),
  ink: z.enum(["acid", "solar", "ice"]),
  shirtColor: z.enum(["black", "white"]),
  size: z.enum(["S", "M", "L", "XL", "2XL"]),
  quantity: z.number().int().min(1).max(5),
});

export type ShirtOrder = z.infer<typeof orderSchema>;

export const inkPalettes = {
  acid: { main: "#c8ff35", accent: "#ff5a45" },
  solar: { main: "#ff754f", accent: "#ffe55c" },
  ice: { main: "#8be9ff", accent: "#c8ff35" },
} as const;

function encryptionKey() {
  const secret = process.env.ARTWORK_SIGNING_SECRET;
  if (!secret || secret.length < 24) throw new Error("ARTWORK_SIGNING_SECRET is not configured");
  return createHash("sha256").update(secret).digest();
}

export function sealOrder(order: ShirtOrder) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(order), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function openOrder(token: string) {
  const payload = Buffer.from(token, "base64url");
  if (payload.length < 29) throw new Error("Invalid artwork token");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
  return orderSchema.parse(JSON.parse(decrypted));
}

export function designSeed(order: Pick<ShirtOrder, "place" | "date" | "phrase">) {
  return Array.from(`${order.place}${order.date}${order.phrase}`).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 97);
}

export function siteUrl(fallback?: string) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return fallback?.replace(/\/$/, "") || "http://localhost:3000";
}
