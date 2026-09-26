/**
 * The SkySpec: everything needed to deterministically render one shirt.
 * Kept deliberately small so it fits in Stripe Checkout metadata and in a
 * signed URL, letting the storefront stay stateless — the print file can be
 * regenerated on demand at any time, forever.
 */
import { isOfferedSize, isColorId, type Size } from "./products";

export interface SkySpec {
  /** Codec version. */
  v: 1;
  /** Local civil date "YYYY-MM-DD" and 24h clock time "HH:MM". */
  date: string;
  time: string;
  /** IANA timezone of the moment. */
  tz: string;
  lat: number;
  lng: number;
  /** Display string for the place, e.g. "Reykjavík, Iceland". */
  place: string;
  /** Headline — usually a name. */
  name: string;
  /** Kicker line above the name, e.g. "The Night You Were Born". */
  title: string;
  /** Optional personal message near the foot of the print. */
  message: string;
  /** Prodigi garment attributes. */
  color: string;
  size: Size;
}

export const MAX_NAME = 28;
export const MAX_TITLE = 34;
export const MAX_MESSAGE = 64;
export const MAX_PLACE = 42;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ValidatedSpec { ok: true; spec: SkySpec }
export interface InvalidSpec { ok: false; error: string }

function clean(v: unknown, max: number): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Validate and normalize a spec coming from the browser or from metadata. */
export function validateSpec(input: unknown): ValidatedSpec | InvalidSpec {
  if (typeof input !== "object" || input === null) return { ok: false, error: "missing spec" };
  const r = input as Record<string, unknown>;

  const date = clean(r.date, 10);
  const time = clean(r.time, 5) || "12:00";
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) return { ok: false, error: "invalid date" };
  if (!TIME_RE.test(time)) return { ok: false, error: "invalid time" };

  const tz = clean(r.tz, 64);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { ok: false, error: "unknown timezone" };
  }

  const lat = Number(r.lat), lng = Number(r.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { ok: false, error: "invalid latitude" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { ok: false, error: "invalid longitude" };

  const name = clean(r.name, MAX_NAME);
  const title = clean(r.title, MAX_TITLE) || "The Night Sky Above";
  const message = clean(r.message, MAX_MESSAGE);
  const place = clean(r.place, MAX_PLACE);
  if (name.length < 1) return { ok: false, error: "add a name" };
  if (place.length < 2) return { ok: false, error: "choose a place" };

  const color = clean(r.color, 32);
  const size = clean(r.size, 8);
  if (!isColorId(color)) return { ok: false, error: "unknown garment color" };
  if (!isOfferedSize(size)) return { ok: false, error: "unknown garment size" };

  const [y, mo, d] = date.split("-").map(Number);
  if (y < 1900 || y > 2100) return { ok: false, error: "date out of range" };
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return { ok: false, error: "invalid date" };

  return {
    ok: true,
    spec: { v: 1, date, time, tz, lat, lng, place, name, title, message, color, size },
  };
}

/**
 * Compact array codec for Stripe metadata / URLs.
 * Order: v, date, time, tz, lat, lng, place, name, title, message, color, size
 */
export function encodeSpec(s: SkySpec): string {
  return JSON.stringify([
    1, s.date, s.time, s.tz, +s.lat.toFixed(4), +s.lng.toFixed(4),
    s.place, s.name, s.title, s.message, s.color, s.size,
  ]);
}

export function decodeSpec(encoded: string): ValidatedSpec | InvalidSpec {
  try {
    const a = JSON.parse(encoded);
    if (!Array.isArray(a) || a.length !== 12 || a[0] !== 1) return { ok: false, error: "bad payload" };
    return validateSpec({
      v: 1, date: a[1], time: a[2], tz: a[3], lat: a[4], lng: a[5],
      place: a[6], name: a[7], title: a[8], message: a[9], color: a[10], size: a[11],
    });
  } catch {
    return { ok: false, error: "bad payload" };
  }
}

/** Short, stable order number derived from the spec itself. */
export function specNumber(s: SkySpec): string {
  // FNV-1a — deterministic, no node:crypto needed on the client.
  let h = 0x811c9dc5;
  for (const str of [s.date, s.time, s.tz, s.place, s.name, s.title, s.message]) {
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
