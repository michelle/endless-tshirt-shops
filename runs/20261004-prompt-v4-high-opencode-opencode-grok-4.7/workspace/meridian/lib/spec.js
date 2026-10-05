import crypto from "crypto";
import { COLORS, SIZES } from "./colors.js";

const COLOR_IDS = new Set(COLORS.map((c) => c.id));
const SIZE_IDS = new Set(SIZES.map((s) => s.id));

export function cleanText(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function parseSpec(input) {
  const title = cleanText(input.title, 42);
  const dedication = cleanText(input.dedication, 48);
  const place = cleanText(input.place, 64);
  const date = cleanText(input.date, 10);
  const time = cleanText(input.time, 5);
  const tz = cleanText(input.tz, 64);
  const color = cleanText(input.color, 40);
  const size = cleanText(input.size, 8).toLowerCase();
  const lat = Number(input.lat);
  const lon = Number(input.lon);
  const qty = Math.round(Number(input.qty || 1));

  const errors = [];
  if (title.length < 2) errors.push("Give the moment a name.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z"))) {
    errors.push("Choose a valid date.");
  } else {
    const year = Number(date.slice(0, 4));
    if (year < 1920 || year > 2036) errors.push("Dates from 1920 through 2036 can be charted.");
  }
  if (!/^\d{2}:\d{2}$/.test(time)) errors.push("Choose a time.");
  else {
    const [hh, mm] = time.split(":").map(Number);
    if (hh > 23 || mm > 59) errors.push("That time is not valid.");
  }
  if (!tz || !isTimeZone(tz)) errors.push("Choose a place so we know the time zone.");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push("Latitude is missing.");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push("Longitude is missing.");
  if (place.length < 2) errors.push("Choose a place.");
  if (!COLOR_IDS.has(color)) errors.push("Choose a shirt color.");
  if (!SIZE_IDS.has(size)) errors.push("Choose a size.");
  if (!Number.isFinite(qty) || qty < 1 || qty > 4) errors.push("Quantity must be 1 to 4.");

  const spec = {
    title,
    dedication,
    date,
    time,
    tz,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    place,
    color,
    size,
    qty,
  };
  return { spec, errors };
}

function isTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function signSpec(spec) {
  const secret = process.env.ART_SIGNING_SECRET;
  if (!secret) throw new Error("ART_SIGNING_SECRET is not set");
  const payload = Buffer.from(JSON.stringify(spec)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}~${sig}`;
}

export function verifyToken(token) {
  const secret = process.env.ART_SIGNING_SECRET;
  if (!secret) throw new Error("ART_SIGNING_SECRET is not set");
  const raw = String(token || "");
  const cut = raw.lastIndexOf("~");
  if (cut <= 0) throw new Error("Malformed artwork token");
  const payload = raw.slice(0, cut);
  const sig = raw.slice(cut + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Artwork signature mismatch");
  }
  const spec = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const parsed = parseSpec(spec);
  if (parsed.errors.length) throw new Error(parsed.errors[0]);
  return parsed.spec;
}

export const COUNTRIES = [
  "US", "CA", "GB", "AU", "NZ", "IE", "DE", "FR", "NL", "BE", "AT", "CH",
  "SE", "NO", "DK", "FI", "ES", "IT", "PT", "LU", "PL", "CZ", "SK", "HU",
  "GR", "HR", "SI", "EE", "LV", "LT", "IS", "JP", "SG", "HK", "MX", "BR",
  "ZA", "AE", "IL", "KR", "IN", "PH", "MY", "TH", "TW", "PR",
];
