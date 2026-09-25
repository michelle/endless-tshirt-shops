// Order model: validation, pricing, and signed tokens that carry an
// order's full configuration through checkout without a database.

import crypto from "crypto";
import type { SkyConfig } from "./starmap";
import {
  COLORS,
  SIZES,
  SHIRT_SKU,
  PRICE_SHIRT_CENTS,
  PRICE_SHIPPING_CENTS,
  CURRENCY,
} from "./catalog";

export { COLORS, SIZES, SHIRT_SKU, PRICE_SHIRT_CENTS, PRICE_SHIPPING_CENTS, CURRENCY };

export interface OrderConfig extends SkyConfig {
  color: string;
  size: string;
  ref: string; // merchant reference, created at checkout time
}

export interface ShippingAddress {
  name: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string; // ISO-2
}

export function validateDesignInput(body: unknown): (SkyConfig & { color: string; size: string }) | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const date = String(b.date ?? "");
  const time = String(b.time ?? "21:00");
  const place = String(b.place ?? "").slice(0, 80);
  const title = String(b.title ?? "").slice(0, 48);
  const color = String(b.color ?? "");
  const size = String(b.size ?? "").toLowerCase();
  if (!isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!isFinite(lng) || lng < -180 || lng > 180) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const dt = new Date(`${date}T${time}:00`);
  if (isNaN(dt.getTime())) return null;
  if (place.length < 2) return null;
  const colorDef = COLORS.find((c) => c.id === color);
  if (!colorDef) return null;
  if (!SIZES.includes(size)) return null;
  return {
    lat,
    lng,
    date,
    time,
    place,
    title: title || "Our Sky",
    theme: colorDef.theme,
    color: colorDef.id,
    size,
  };
}

function secret(): string {
  const s = process.env.ORDER_SECRET;
  if (!s) throw new Error("ORDER_SECRET is not set");
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function signPayload<T extends object>(payload: T): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken<T>(token: string): T | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = crypto.createHmac("sha256", secret()).update(body).digest();
  let got: Buffer;
  try {
    got = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (got.length !== expect.length || !crypto.timingSafeEqual(got, expect)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

// Flat field-set for Stripe metadata (each value < 500 chars).
export function toMetadata(cfg: OrderConfig): Record<string, string> {
  const m: Record<string, string> = {
    ref: cfg.ref,
    lat: String(cfg.lat),
    lng: String(cfg.lng),
    date: cfg.date,
    time: cfg.time,
    place: cfg.place,
    title: cfg.title,
    color: cfg.color,
    size: cfg.size,
    theme: cfg.theme,
  };
  m.sig = crypto
    .createHmac("sha256", secret())
    .update(
      ["ref", "lat", "lng", "date", "time", "place", "title", "color", "size", "theme"]
        .map((k) => m[k])
        .join("|")
    )
    .digest("hex");
  return m;
}

export function fromMetadata(md: Record<string, string>): OrderConfig | null {
  const keys = ["ref", "lat", "lng", "date", "time", "place", "title", "color", "size", "theme"];
  const expect = crypto
    .createHmac("sha256", secret())
    .update(keys.map((k) => md[k] ?? "").join("|"))
    .digest("hex");
  if (md.sig !== expect) return null;
  const cfg = validateDesignInput({ ...md, lat: Number(md.lat), lng: Number(md.lng) });
  if (!cfg) return null;
  return { ...cfg, ref: md.ref };
}

export function newRef(): string {
  return `stl_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
