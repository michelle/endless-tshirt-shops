// Shared (client + server) definition of a customer's shirt design.

export const SHIRTS = {
  black: { label: "Midnight Black", prodigi: "black", fabric: "#141416", ink: "light" },
  navy: { label: "Deep Navy", prodigi: "navy blue", fabric: "#1d2536", ink: "light" },
  maroon: { label: "Maroon", prodigi: "maroon", fabric: "#4e1d27", ink: "light" },
  ash: { label: "Ash Grey", prodigi: "ash", fabric: "#dcdcd8", ink: "dark" },
  white: { label: "White", prodigi: "white", fabric: "#f7f7f5", ink: "dark" },
} as const;
export type ShirtColor = keyof typeof SHIRTS;

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export type Layers = {
  lines: boolean; // constellation stick figures
  names: boolean; // constellation names
  grid: boolean; // equatorial graticule
  planets: boolean; // Moon + naked-eye planets
};

export type Design = {
  title: string;
  message: string;
  place: string;
  lat: number;
  lon: number;
  when: string; // local wall-clock time at the place, "YYYY-MM-DDTHH:mm"
  tz: string; // IANA time zone of the place
  shirt: ShirtColor;
  layers: Layers;
};

export const LIMITS = { title: 32, message: 60, place: 48 };

export const DEFAULT_DESIGN: Design = {
  title: "The Night We Met",
  message: "under these exact stars",
  place: "Brooklyn, New York",
  lat: 40.6501,
  lon: -73.9496,
  when: "2019-06-14T22:30",
  tz: "America/New_York",
  shirt: "black",
  layers: { lines: true, names: false, grid: true, planets: true },
};

// Printable glyphs we ship fonts for (Latin + Latin-1 supplement + common punctuation).
const PRINTABLE = /^[ -~ -ſ‘’“”–—•…♥★·]*$/;

export function cleanText(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .slice(0, max);
}

/** Validates and normalises untrusted input. Throws with a customer-friendly message. */
export function parseDesign(input: unknown): Design {
  const d = (input ?? {}) as Record<string, unknown>;
  const title = cleanText(d.title, LIMITS.title).trim();
  const message = cleanText(d.message, LIMITS.message).trim();
  const place = cleanText(d.place, LIMITS.place).trim();
  for (const [k, v] of Object.entries({ title, message, place })) {
    if (!PRINTABLE.test(v)) throw new Error(`The ${k} contains characters we can't print yet — please use Latin letters.`);
  }
  if (!title) throw new Error("Please give your shirt a title.");
  const lat = Number(d.lat);
  const lon = Number(d.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Invalid latitude.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error("Invalid longitude.");
  const when = String(d.when ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) throw new Error("Please choose a date and time.");
  const year = Number(when.slice(0, 4));
  if (year < 1800 || year > 2200) throw new Error("Pick a date between 1800 and 2200.");
  const tz = String(d.tz ?? "UTC");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error("Unknown time zone.");
  }
  const shirt = String(d.shirt) as ShirtColor;
  if (!(shirt in SHIRTS)) throw new Error("Unknown shirt colour.");
  const l = (d.layers ?? {}) as Record<string, unknown>;
  const layers: Layers = {
    lines: l.lines !== false,
    names: l.names === true,
    grid: l.grid !== false,
    planets: l.planets !== false,
  };
  return { title, message, place, lat: round(lat, 4), lon: round(lon, 4), when, tz, shirt, layers };
}

function round(n: number, p: number) {
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

// ---------- compact encoding (for URLs + Stripe metadata) ----------

export function encodeDesign(d: Design): string {
  const layers = (d.layers.lines ? 1 : 0) | (d.layers.names ? 2 : 0) | (d.layers.grid ? 4 : 0) | (d.layers.planets ? 8 : 0);
  const arr = [1, d.title, d.message, d.place, d.lat, d.lon, d.when, d.tz, d.shirt, layers];
  return b64urlEncode(JSON.stringify(arr));
}

export function decodeDesign(s: string): Design {
  const arr = JSON.parse(b64urlDecode(s));
  if (!Array.isArray(arr) || arr[0] !== 1) throw new Error("Bad design token");
  const [, title, message, place, lat, lon, when, tz, shirt, layers] = arr;
  return parseDesign({
    title, message, place, lat, lon, when, tz, shirt,
    layers: { lines: !!(layers & 1), names: !!(layers & 2), grid: !!(layers & 4), planets: !!(layers & 8) },
  });
}

function b64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// ---------- time helpers ----------

/** Converts a wall-clock time in an IANA zone to a UTC Date (handles DST). */
export function zonedToUtc(local: string, tz: string): Date {
  const [date, time] = local.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  let guess = asUtc - tzOffsetMs(asUtc, tz);
  guess = asUtc - tzOffsetMs(guess, tz);
  return new Date(guess);
}

function tzOffsetMs(utcMs: number, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return wall - Math.floor(utcMs / 1000) * 1000;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatWhen(local: string): string {
  const [date, time] = local.split("T");
  const [y, m, d] = date.split("-").map(Number);
  let [h, mi] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${MONTHS[m - 1]} ${d}, ${y} · ${h}:${String(mi).padStart(2, "0")} ${ampm}`;
}

export function formatCoords(lat: number, lon: number): string {
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  return `${f(lat, "N", "S")}   ${f(lon, "E", "W")}`;
}
