import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";

export const PRICE_CENTS = 2250;
export const PRICE_DISPLAY = "$22.50";

export const PRODUCT_SKUS = {
  fitted: "GLOBAL-TEE-GIL-64000L",
  unisex: "GLOBAL-TEE-GIL-64000",
} as const;

export type ShirtFit = keyof typeof PRODUCT_SKUS;
export type ShirtSize = "S" | "M" | "L" | "XL";

export function isShirtFit(value: unknown): value is ShirtFit {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

export function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{13}$/.test(value)) return false;
  const time = Number(value);
  return Number.isSafeInteger(time) && Math.abs(Date.now() - time) < 10 * 60_000;
}

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("Stripe is not configured.");
  return new Stripe(apiKey);
}

export function getRequestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

function getArtworkSecret() {
  const secret = process.env.ARTWORK_SECRET;
  if (!secret) throw new Error("Artwork signing is not configured.");
  return secret;
}

export function signArtwork(timestamp: string, sessionId: string) {
  return createHmac("sha256", getArtworkSecret())
    .update(`${timestamp}:${sessionId}`)
    .digest("hex");
}

export function verifyArtworkSignature(
  timestamp: string,
  sessionId: string,
  signature: string,
) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signArtwork(timestamp, sessionId), "hex");
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function prodigiIdempotencyKey(sessionId: string) {
  const digest = createHash("sha256").update(sessionId).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}
