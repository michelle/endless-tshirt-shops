import { COLOR_BY_ID, isPalette, isSize, type Size } from "./catalog";

/** Everything that determines the printed artwork. */
export interface DesignParams {
  /** Primary line, e.g. "Ada & Charles". */
  title: string;
  /** Optional secondary line, e.g. "The night we met". */
  subtitle: string;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  /** 24h local clock time, HH:MM. */
  time: string;
  /** IANA time zone of the place, e.g. "Europe/London". */
  tz: string;
  /** Human readable place, e.g. "London, United Kingdom". */
  place: string;
  lat: number;
  lng: number;
  palette: string;
}

export interface OrderSelection {
  size: Size;
  color: string;
  quantity: number;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // Strip control characters and collapse runs of whitespace; keep unicode.
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseDesign(input: unknown): DesignParams {
  const raw = (input ?? {}) as Record<string, unknown>;
  const title = clean(raw.title, 42);
  const subtitle = clean(raw.subtitle, 56);
  const date = clean(raw.date, 10);
  const time = clean(raw.time, 5);
  const tz = clean(raw.tz, 64);
  const place = clean(raw.place, 64);
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  const palette = String(raw.palette ?? "");

  if (!title) throw new Error("Please add a name or title for the chart.");
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error("Please choose a valid date.");
  }
  if (!TIME_RE.test(time)) throw new Error("Please choose a valid time.");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Latitude must be between -90 and 90.");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Longitude must be between -180 and 180.");
  if (!place) throw new Error("Please choose a place.");
  if (!isPalette(palette)) throw new Error("Please choose a colour palette.");

  return {
    title,
    subtitle,
    date,
    time,
    tz: tz || "UTC",
    place,
    lat: Math.round(lat * 1e4) / 1e4,
    lng: Math.round(lng * 1e4) / 1e4,
    palette,
  };
}

export function parseSelection(input: unknown): OrderSelection {
  const raw = (input ?? {}) as Record<string, unknown>;
  const size = raw.size;
  const color = String(raw.color ?? "");
  const quantity = Math.floor(Number(raw.quantity ?? 1));
  if (!isSize(size)) throw new Error("Please choose a size.");
  if (!COLOR_BY_ID.has(color)) throw new Error("Please choose a shirt colour.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error("Quantity must be between 1 and 10.");
  }
  return { size, color, quantity };
}

/** Isomorphic base64url encoder so the browser can build preview URLs too. */
export function encodeDesign(design: DesignParams): string {
  const json = JSON.stringify(design);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDesign(token: string): DesignParams {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    throw new Error("Malformed design token.");
  }
  return parseDesign(parsed);
}

/**
 * Resolve a wall-clock date and time in an IANA zone to a UTC instant. Uses a
 * two-pass offset lookup so daylight saving at the target date is honoured.
 */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  const guess = new Date(naive);
  const offset = zoneOffsetMs(guess, timeZone);
  const first = new Date(naive - offset);
  const second = new Date(naive - zoneOffsetMs(first, timeZone));
  return second;
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
  } catch {
    return 0;
  }
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}
