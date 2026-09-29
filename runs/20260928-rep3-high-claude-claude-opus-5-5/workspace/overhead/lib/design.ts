// The customer's design: a moment (date, time, place) plus the words and styling
// printed around the sky chart. Shared by the browser and the server so the
// preview and the print file are rendered from exactly the same data.

import { SHIRT_COLORS, colorByKey } from "./catalog";

export const INKS = [
  { key: "starlight", label: "Starlight", note: "One tone, pure and quiet" },
  { key: "gold", label: "Gilded", note: "Gold constellations & moon" },
  { key: "rose", label: "Rosé", note: "Warm rose accents" },
  { key: "aurora", label: "Aurora", note: "Glacier-teal accents" },
] as const;
export type InkKey = (typeof INKS)[number]["key"];

export type Design = {
  date: string; // YYYY-MM-DD, local to `tz`
  time: string; // HH:MM, 24h, local to `tz`
  tz: string; // IANA zone of the place
  lat: number;
  lon: number;
  place: string; // shown on the shirt
  title: string;
  message: string;
  ink: InkKey;
  color: string; // SHIRT_COLORS key
  lines: boolean; // constellation lines
  names: boolean; // constellation names
  planets: boolean; // moon & planets
  grid: boolean; // altitude rings
};

export const LIMITS = { title: 28, message: 56, place: 44 } as const;

export const DEFAULT_DESIGN: Design = {
  date: "2019-10-12",
  time: "21:40",
  tz: "America/New_York",
  lat: 40.6782,
  lon: -73.9442,
  place: "Brooklyn, New York",
  title: "The Night We Met",
  message: "and everything after",
  ink: "gold",
  color: "black",
  lines: true,
  names: false,
  planets: true,
  grid: false,
};

const clean = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

function validTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validates untrusted input into a Design. Throws on anything unusable. */
export function parseDesign(input: unknown): Design {
  const o = (input ?? {}) as Record<string, unknown>;
  const date = String(o.date ?? "");
  const time = String(o.time ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  const [y, m, d] = date.split("-").map(Number);
  if (y < 1800 || y > 2100) throw new Error("Date out of range");
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) throw new Error("Invalid date");
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("Invalid time");
  const [hh, mm] = time.split(":").map(Number);
  if (hh > 23 || mm > 59) throw new Error("Invalid time");
  const tz = String(o.tz ?? "");
  if (!tz || tz.length > 64 || !validTz(tz)) throw new Error("Invalid time zone");
  const lat = Number(o.lat);
  const lon = Number(o.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Invalid latitude");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("Invalid longitude");
  const ink = INKS.some((i) => i.key === o.ink) ? (o.ink as InkKey) : "starlight";
  const color = SHIRT_COLORS.some((c) => c.key === o.color) ? String(o.color) : "black";
  return {
    date,
    time,
    tz,
    lat: Math.round(lat * 1e4) / 1e4,
    lon: Math.round(lon * 1e4) / 1e4,
    place: clean(o.place, LIMITS.place),
    title: clean(o.title, LIMITS.title),
    message: clean(o.message, LIMITS.message),
    ink,
    color,
    lines: o.lines !== false,
    names: o.names === true,
    planets: o.planets !== false,
    grid: o.grid === true,
  };
}

// Compact encoding (used in Stripe metadata and signed art URLs; must stay < 500 chars).
export function packDesign(d: Design): string {
  return JSON.stringify([
    1, d.date, d.time, d.tz, d.lat, d.lon, d.place, d.title, d.message, d.ink, d.color,
    (d.lines ? 1 : 0) | (d.names ? 2 : 0) | (d.planets ? 4 : 0) | (d.grid ? 8 : 0),
  ]);
}

export function unpackDesign(s: string): Design {
  const a = JSON.parse(s);
  if (!Array.isArray(a) || a[0] !== 1) throw new Error("Unknown design encoding");
  const f = Number(a[11]);
  return parseDesign({
    date: a[1], time: a[2], tz: a[3], lat: a[4], lon: a[5], place: a[6], title: a[7],
    message: a[8], ink: a[9], color: a[10],
    lines: !!(f & 1), names: !!(f & 2), planets: !!(f & 4), grid: !!(f & 8),
  });
}

/** Converts a wall-clock time in an IANA zone to a UTC Date. */
export function zonedTimeToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(t));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return wall - t;
  };
  let t = asUtc - offsetAt(asUtc);
  t = asUtc - offsetAt(t); // second pass settles DST edges
  return new Date(t);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export function formatMomentDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatMomentTime(time: string): string {
  const [hh, mm] = time.split(":").map(Number);
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${ns}  ${Math.abs(lon).toFixed(4)}°${ew}`;
}

export type Palette = { ink: string; accent: string; soft: string; shirt: string };

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function paletteFor(d: Pick<Design, "ink" | "color">): Palette {
  const shirt = colorByKey(d.color);
  const accents: Record<InkKey, [string, string]> = {
    // [on dark garments, on light garments]
    starlight: ["#f3eee3", "#1c2340"],
    gold: ["#dcb462", "#9a6b1f"],
    rose: ["#eaa3ad", "#a8425a"],
    aurora: ["#86d4c8", "#23706f"],
  };
  const ink = shirt.dark ? "#f3eee3" : "#1c2340";
  const accent = accents[d.ink][shirt.dark ? 0 : 1];
  // "soft" is a solid tint between ink and garment — DTG prints solid colours
  // more reliably than transparency.
  return { ink, accent, soft: mix(shirt.hex, ink, 0.55), shirt: shirt.hex };
}
