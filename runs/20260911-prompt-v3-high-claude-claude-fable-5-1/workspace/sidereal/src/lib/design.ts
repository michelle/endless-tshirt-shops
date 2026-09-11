import { z } from "zod";
import { GARMENT_KEYS, SIZES } from "./catalog";

// A "design" is everything needed to reproduce a customer's sky map.
// It's small enough to live in a URL and in Stripe metadata (< 500 chars).

export const STYLES = ["constellations", "stars", "atlas"] as const;
export type Style = (typeof STYLES)[number];

export const designSchema = z.object({
  title: z.string().trim().max(48).default(""),
  place: z.string().trim().max(48).default(""),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "time must be HH:MM"),
  tz: z.string().min(1).max(64),
  style: z.enum(STYLES).default("constellations"),
  color: z.boolean().default(true), // true-colour stars vs single ink
  garment: z.enum(GARMENT_KEYS).default("black"),
});

export type Design = z.infer<typeof designSchema>;

export const orderInputSchema = z.object({
  design: designSchema,
  size: z.enum(SIZES),
  quantity: z.number().int().min(1).max(10).default(1),
});
export type OrderInput = z.infer<typeof orderInputSchema>;

export const DEFAULT_DESIGN: Design = {
  title: "The night we met",
  place: "Lisbon, Portugal",
  lat: 38.7223,
  lon: -9.1393,
  date: "2019-06-14",
  time: "22:30",
  tz: "Europe/Lisbon",
  style: "constellations",
  color: true,
  garment: "black",
};

// Compact, URL-safe encoding. Order of keys is fixed so the same design
// always encodes to the same string (used for idempotent file names).
const KEYS: (keyof Design)[] = ["title", "place", "lat", "lon", "date", "time", "tz", "style", "color", "garment"];

// Isomorphic base64url helpers (the studio encodes in the browser, the API decodes on the server).
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeDesign(d: Design): string {
  const obj: Record<string, unknown> = {};
  for (const k of KEYS) obj[k] = d[k];
  return toBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

export function decodeDesign(s: string): Design {
  const json = new TextDecoder().decode(fromBase64Url(s));
  return designSchema.parse(JSON.parse(json));
}

export function safeDecodeDesign(s: string | null | undefined): Design | null {
  if (!s) return null;
  try {
    return decodeDesign(s);
  } catch {
    return null;
  }
}

export function formatCoords(lat: number, lon: number): string {
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  return `${f(lat, "N", "S")}  ${f(lon, "E", "W")}`;
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[(m - 1) % 12]} ${y}`;
}
