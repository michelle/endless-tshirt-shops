// Everything that defines a customer's design: the parameters, validation,
// garment options and pricing. Shared by the browser and the server.

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000"; // Gildan 64000 Softstyle unisex tee

export interface ShirtColor {
  key: string; // Prodigi attribute value
  label: string;
  hex: string; // approximate garment colour for the on-screen mockup
  ink: "light" | "dark"; // which ink palette prints well on it
}

export const SHIRT_COLORS: ShirtColor[] = [
  { key: "black", label: "Black", hex: "#141414", ink: "light" },
  { key: "navy blue", label: "Navy", hex: "#1d2540", ink: "light" },
  { key: "dark heather grey", label: "Dark Heather", hex: "#4a4a4f", ink: "light" },
  { key: "forest green", label: "Forest", hex: "#22392b", ink: "light" },
  { key: "maroon", label: "Maroon", hex: "#5b1f2c", ink: "light" },
  { key: "white", label: "White", hex: "#f7f7f5", ink: "dark" },
  { key: "sand", label: "Sand", hex: "#e2d5b8", ink: "dark" },
  { key: "sport grey", label: "Sport Grey", hex: "#b9b9b7", ink: "dark" },
];

export const SHIRT_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export const UNIT_PRICE_CENTS = 3800; // USD 38.00 per shirt
export const CURRENCY = "usd";
export const MAX_QUANTITY = 10;

export interface Design {
  place: string; // display label, e.g. "Lisbon, Portugal"
  lat: number;
  lon: number; // east-positive
  date: string; // YYYY-MM-DD, local wall clock
  time: string; // HH:MM, local wall clock
  tz: string; // IANA timezone of the place
  title: string; // headline caption
  subtitle: string; // optional second line
  lines: boolean; // draw constellation lines
  color: string; // SHIRT_COLORS key
  size: ShirtSize;
}

export const LIMITS = { place: 60, title: 40, subtitle: 48 } as const;

export const DEFAULT_DESIGN: Design = {
  place: "Lisbon, Portugal",
  lat: 38.7167,
  lon: -9.1333,
  date: "2019-06-21",
  time: "23:30",
  tz: "Europe/Lisbon",
  title: "The night we met",
  subtitle: "Ana & Tomas",
  lines: true,
  color: "black",
  size: "m",
};

/** Ink colour that prints well on the chosen garment. */
export function inkFor(colorKey: string): string {
  const c = SHIRT_COLORS.find((s) => s.key === colorKey);
  return c?.ink === "dark" ? "#101a2e" : "#ffffff";
}

// Strip ASCII control characters (U+0000..U+001F, U+007F) and collapse whitespace.
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

function clean(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Validate and normalise untrusted input into a Design, or throw an Error with a user-facing message. */
export function parseDesign(input: unknown): Design {
  if (!input || typeof input !== "object") throw new Error("Missing design");
  const d = input as Record<string, unknown>;

  const lat = Number(d.lat);
  const lon = Number(d.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Invalid latitude");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("Invalid longitude");

  const date = String(d.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  const [y, m, day] = date.split("-").map(Number);
  if (y < 1800 || y > 2200 || m < 1 || m > 12 || day < 1 || day > 31) throw new Error("Date out of range");
  const probe = new Date(Date.UTC(y, m - 1, day));
  if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== day) throw new Error("Invalid date");

  const time = String(d.time ?? "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Invalid time");

  const tz = String(d.tz ?? "");
  if (tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) throw new Error("Invalid timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error("Unknown timezone");
  }

  const color = String(d.color ?? "");
  if (!SHIRT_COLORS.some((c) => c.key === color)) throw new Error("Unknown shirt colour");
  const size = String(d.size ?? "") as ShirtSize;
  if (!SHIRT_SIZES.includes(size)) throw new Error("Unknown size");

  const place = clean(d.place, LIMITS.place);
  if (!place) throw new Error("Place is required");
  const title = clean(d.title, LIMITS.title);
  const subtitle = clean(d.subtitle, LIMITS.subtitle);

  return {
    place,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    date,
    time,
    tz,
    title,
    subtitle,
    lines: d.lines === true || d.lines === "true" || d.lines === "1",
    color,
    size,
  };
}

/** Flatten a design into string key/values (fits Stripe metadata limits). */
export function designToMetadata(d: Design): Record<string, string> {
  return {
    d_place: d.place,
    d_lat: String(d.lat),
    d_lon: String(d.lon),
    d_date: d.date,
    d_time: d.time,
    d_tz: d.tz,
    d_title: d.title,
    d_subtitle: d.subtitle,
    d_lines: d.lines ? "1" : "0",
    d_color: d.color,
    d_size: d.size,
  };
}

export function designFromMetadata(m: Record<string, string> | null | undefined): Design {
  if (!m) throw new Error("No design metadata");
  return parseDesign({
    place: m.d_place,
    lat: m.d_lat,
    lon: m.d_lon,
    date: m.d_date,
    time: m.d_time,
    tz: m.d_tz,
    title: m.d_title,
    subtitle: m.d_subtitle,
    lines: m.d_lines,
    color: m.d_color,
    size: m.d_size,
  });
}

export function formatCoords(lat: number, lon: number): string {
  const f = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const deg = Math.floor(a);
    const min = Math.round((a - deg) * 60);
    return `${deg}°${String(min).padStart(2, "0")}'${v >= 0 ? pos : neg}`;
  };
  return `${f(lat, "N", "S")}   ${f(lon, "E", "W")}`;
}

export function formatDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
