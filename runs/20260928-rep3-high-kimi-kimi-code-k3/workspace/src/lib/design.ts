// Shared design-parameter model for a custom star-map shirt.
// Isomorphic: used by the client customizer, the checkout API and the
// server-side print renderer.

export const SHIRT_COLORS = ["black", "navy blue", "white"] as const;
export const SHIRT_SIZES = ["s", "m", "l", "xl", "2xl", "3xl"] as const;

export type ShirtColor = (typeof SHIRT_COLORS)[number];
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export interface DesignParams {
  /** Local date of the moment, YYYY-MM-DD */
  date: string;
  /** Local time of the moment, HH:MM (24h) */
  time: string;
  lat: number;
  lon: number;
  /** Human-readable place name, e.g. "Paris, France" */
  place: string;
  /** Customer's headline, e.g. "The Night We Met" */
  title: string;
  color: ShirtColor;
  size: ShirtSize;
}

export class DesignError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateDesign(input: unknown): DesignParams {
  if (typeof input !== "object" || input === null) throw new DesignError("Invalid design payload");
  const d = input as Record<string, unknown>;

  if (typeof d.date !== "string" || !DATE_RE.test(d.date)) throw new DesignError("A valid date is required");
  if (typeof d.time !== "string" || !TIME_RE.test(d.time)) throw new DesignError("A valid time is required");
  const lat = Number(d.lat);
  const lon = Number(d.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new DesignError("Latitude must be between -90 and 90");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new DesignError("Longitude must be between -180 and 180");
  if (typeof d.place !== "string" || d.place.trim().length === 0 || d.place.length > 60)
    throw new DesignError("Place is required (max 60 characters)");
  if (typeof d.title !== "string" || d.title.trim().length === 0 || d.title.length > 40)
    throw new DesignError("A title is required (max 40 characters)");
  if (!SHIRT_COLORS.includes(d.color as ShirtColor)) throw new DesignError("Unknown shirt color");
  if (!SHIRT_SIZES.includes(d.size as ShirtSize)) throw new DesignError("Unknown shirt size");

  return {
    date: d.date,
    time: d.time,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    place: d.place.trim(),
    title: d.title.trim(),
    color: d.color as ShirtColor,
    size: d.size as ShirtSize,
  };
}

/** Compact, URL-safe canonical encoding of a design. */
export function encodeDesign(d: DesignParams): string {
  const json = JSON.stringify(d);
  return Buffer.from(json, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeDesign(encoded: string): unknown {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
  return JSON.parse(Buffer.from(pad, "base64").toString("utf8"));
}

/** Compact key=value string used in Stripe metadata (500-char value limit). */
export function designToMetadata(d: DesignParams): string {
  return [
    `d=${d.date}`,
    `t=${d.time}`,
    `la=${d.lat}`,
    `lo=${d.lon}`,
    `p=${d.place}`,
    `ti=${d.title}`,
    `c=${d.color}`,
    `s=${d.size}`,
  ].join(";");
}

export function designFromMetadata(meta: string): DesignParams {
  const kv: Record<string, string> = {};
  for (const pair of meta.split(";")) {
    const i = pair.indexOf("=");
    if (i > 0) kv[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return validateDesign({
    date: kv.d,
    time: kv.t,
    lat: Number(kv.la),
    lon: Number(kv.lo),
    place: kv.p,
    title: kv.ti,
    color: kv.c,
    size: kv.s,
  });
}

export const PRICE_CENTS: Record<ShirtSize, number> = {
  s: 3499,
  m: 3499,
  l: 3499,
  xl: 3499,
  "2xl": 3799,
  "3xl": 3799,
};

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
