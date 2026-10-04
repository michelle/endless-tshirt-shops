import { COUNTRIES, SHIRTS, SIZES, type DesignSpec } from "./catalog";

const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'\-]{0,17}$/u;
const LINE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,''"!?&:\-]{0,46}$/u;

export function cleanName(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function parseDesign(input: unknown): DesignSpec {
  const raw = (input ?? {}) as Record<string, unknown>;
  const name1 = cleanName(raw.name1);
  const name2 = cleanName(raw.name2);
  if (!NAME.test(name1)) throw new Error("Give us a name, up to 18 letters.");
  if (name2 && !NAME.test(name2)) throw new Error("The second name should be 18 letters or fewer.");
  const date = String(raw.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a date.");
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new Error("That date isn’t a real day.");
  }
  if (y < 1920 || y > 2099) throw new Error("Pick a date between 1920 and 2099.");
  const approximate = raw.approximate === true || raw.approximate === "1" || raw.approximate === 1;
  const time = String(raw.time ?? "22:00");
  if (!approximate && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Choose a time, or mark the hour as evening.");
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new Error("Choose a place from the suggestions so we can chart the sky.");
  }
  const place = cleanName(raw.place);
  const region = cleanName(raw.region);
  if (place.length < 2 || place.length > 48) throw new Error("Choose a place.");
  const tz = String(raw.tz ?? "UTC");
  if (!/^([A-Za-z_+\-0-9]+\/[A-Za-z_+\-0-9]+|UTC|Etc\/[A-Za-z0-9+\-]+)$/.test(tz)) {
    throw new Error("That place didn’t include a timezone. Try another result.");
  }
  const line = String(raw.line ?? "").replace(/\s+/g, " ").trim();
  if (line && !LINE.test(line)) throw new Error("Keep the line to 48 letters, numbers, and simple punctuation.");
  const color = String(raw.color ?? "");
  if (!SHIRTS.some((s) => s.id === color)) throw new Error("Choose a shirt color.");
  const size = String(raw.size ?? "");
  if (!SIZES.some((s) => s.id === size)) throw new Error("Choose a size.");
  return {
    name1,
    name2,
    date,
    time: approximate ? "22:00" : time,
    approximate,
    place,
    region,
    lat,
    lon,
    tz,
    line,
    color,
    size,
  };
}

export type ShipTo = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export function parseShip(input: unknown): ShipTo {
  const raw = (input ?? {}) as Record<string, unknown>;
  const name = cleanName(raw.name);
  const email = String(raw.email ?? "").trim();
  const phone = String(raw.phone ?? "").trim();
  const line1 = cleanName(raw.line1);
  const line2 = cleanName(raw.line2);
  const city = cleanName(raw.city);
  const state = cleanName(raw.state);
  const zip = String(raw.zip ?? "").trim();
  const country = String(raw.country ?? "").trim().toUpperCase();
  if (name.length < 2 || name.length > 60) throw new Error("Add the recipient’s name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 80) throw new Error("Add a real email.");
  if (phone && !/^[0-9+().\-\s]{6,20}$/.test(phone)) throw new Error("That phone number looks off.");
  if (line1.length < 3 || line1.length > 80) throw new Error("Add a street address.");
  if (line2.length > 80) throw new Error("The second address line is too long.");
  if (city.length < 2 || city.length > 60) throw new Error("Add a city.");
  if (zip.length < 3 || zip.length > 12) throw new Error("Add a postal code.");
  if (!COUNTRIES.some(([code]) => code === country)) throw new Error("We can’t ship to that country yet.");
  if ((country === "US" || country === "CA" || country === "AU") && state.length < 2) {
    throw new Error("Add a state or province.");
  }
  return { name, email, phone, line1, line2, city, state, zip, country };
}

export function parseQty(value: unknown): number {
  const qty = Number(value ?? 1);
  if (!Number.isInteger(qty) || qty < 1 || qty > 4) throw new Error("Quantity must be 1 to 4.");
  return qty;
}

export function parseShipMethod(value: unknown): "Budget" | "Standard" | "Express" {
  const method = String(value ?? "Standard");
  if (method !== "Budget" && method !== "Standard" && method !== "Express") {
    throw new Error("Choose a shipping method.");
  }
  return method;
}
