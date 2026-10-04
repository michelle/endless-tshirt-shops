// Design model shared by client and server. All untrusted input is normalised through parseDesign.
import { INKS, SHIRT_COLORS, SIZES, inksFor, MAX_QTY_PER_ITEM, type Size } from "./catalog";

export type Place = { name: string; cc: string; lat: number; lon: number; tz: string };

export type Design = {
  title: string;
  date: string; // YYYY-MM-DD, local date at the place
  time: string; // HH:MM local time at the place, or "" if unknown
  place: Place;
  caption: string;
  shirt: string;
  ink: string;
  lines: boolean; // constellation lines
};

export type CartItem = { design: Design; size: Size; qty: number };

export const LIMITS = { title: 30, caption: 44, place: 40 };

// Characters both print fonts (DM Serif Display, Barlow) can render.
const DISALLOWED = /[^ -~ -ſ‘’“”–—…]/g;
export function cleanText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.replace(DISALLOWED, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function parseDesign(raw: any): Design | null {
  if (!raw || typeof raw !== "object") return null;
  const date = String(raw.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const year = +date.slice(0, 4);
  if (year < 1900 || year > 2100 || Number.isNaN(Date.parse(date + "T00:00:00Z"))) return null;
  const time = raw.time ? String(raw.time) : "";
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const p = raw.place;
  if (!p || typeof p !== "object") return null;
  const lat = Number(p.lat), lon = Number(p.lon);
  if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) return null;
  const tz = String(p.tz ?? "");
  if (!validTz(tz)) return null;
  const shirt = SHIRT_COLORS.find((s) => s.id === raw.shirt)?.id;
  if (!shirt) return null;
  const allowed = inksFor(shirt);
  const ink = allowed.find((i) => i.id === raw.ink)?.id ?? allowed[0]?.id ?? INKS[0].id;
  const placeName = cleanText(p.name, LIMITS.place);
  const cc = /^[A-Z]{2}$/.test(String(p.cc)) ? String(p.cc) : "";
  return {
    title: cleanText(raw.title, LIMITS.title),
    date,
    time,
    place: { name: placeName, cc, lat: +lat.toFixed(3), lon: +lon.toFixed(3), tz },
    caption: cleanText(raw.caption, LIMITS.caption),
    shirt,
    ink,
    lines: raw.lines !== false,
  };
}

export function parseCartItem(raw: any): CartItem | null {
  const design = parseDesign(raw?.design);
  if (!design) return null;
  const size = (SIZES as readonly string[]).includes(raw.size) ? (raw.size as Size) : null;
  const qty = Math.floor(Number(raw.qty));
  if (!size || !(qty >= 1 && qty <= MAX_QTY_PER_ITEM)) return null;
  return { design, size, qty };
}

// Compact JSON used for URLs and Stripe metadata (each metadata value must be < 500 chars).
export function packDesign(d: Design): string {
  return JSON.stringify({
    t: d.title, d: d.date, h: d.time, p: [d.place.name, d.place.cc, d.place.lat, d.place.lon, d.place.tz],
    c: d.caption, s: d.shirt, i: d.ink, l: d.lines ? 1 : 0,
  });
}
export function unpackDesign(s: string): Design | null {
  try {
    const o = JSON.parse(s);
    return parseDesign({
      title: o.t, date: o.d, time: o.h, caption: o.c, shirt: o.s, ink: o.i, lines: o.l === 1,
      place: { name: o.p?.[0], cc: o.p?.[1], lat: o.p?.[2], lon: o.p?.[3], tz: o.p?.[4] },
    });
  } catch {
    return null;
  }
}

export function toB64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function fromB64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export const designToParam = (d: Design) => toB64Url(packDesign(d));
export const designFromParam = (s: string | null | undefined) => (s && s.length < 2000 ? unpackDesign(fromB64Url(s)) : null);

export function describeDesign(d: Design) {
  const shirt = SHIRT_COLORS.find((s) => s.id === d.shirt)!;
  return `${shirt.label} tee · ${d.title || "Untitled"} · sky over ${d.place.name || "your place"} on ${d.date}`;
}
