/**
 * A "design" is everything needed to reproduce a customer's plant exactly:
 * the plant inputs plus the garment (which decides light vs dark ink).
 * Designs are small enough to travel inside Stripe metadata and a signed URL.
 */
import { CLIMATE_KEYS, Climate } from "./botanical/palette";
import { PlantInput, parseIsoDate } from "./botanical/generator";
import { GARMENT_COLORS, garmentByKey } from "./catalog";

export interface Design {
  name: string;
  date: string;
  climate: Climate;
  dedication: string;
  variant: number;
  garment: string;
}

export const NAME_MAX = 24;
export const DEDICATION_MAX = 40;

export function defaultDesign(): Design {
  return { name: "", date: "", climate: "meadow", dedication: "", variant: 1, garment: "natural" };
}

/** Validate untrusted input. Returns a normalized design or an error message. */
export function parseDesign(raw: unknown): { design: Design; error?: undefined } | { design?: undefined; error: string } {
  if (!raw || typeof raw !== "object") return { error: "Missing design" };
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 1) return { error: "Please enter a name" };
  if (name.length > NAME_MAX) return { error: `Name must be ${NAME_MAX} characters or fewer` };
  if (!/^[\p{L}\p{M}' .-]+$/u.test(name)) return { error: "Name can only contain letters, spaces, apostrophes, dots and hyphens" };

  const date = typeof r.date === "string" ? r.date.trim() : "";
  if (date && !parseIsoDate(date)) return { error: "Date must be a valid date" };

  const climate = typeof r.climate === "string" ? r.climate : "";
  if (!CLIMATE_KEYS.includes(climate as Climate)) return { error: "Unknown climate" };

  const dedication = typeof r.dedication === "string" ? r.dedication.trim().replace(/\s+/g, " ") : "";
  if (dedication.length > DEDICATION_MAX) return { error: `Dedication must be ${DEDICATION_MAX} characters or fewer` };
  if (/[<>]/.test(dedication)) return { error: "Dedication contains unsupported characters" };

  const variantNum = typeof r.variant === "number" ? r.variant : Number(r.variant);
  const variant = Number.isInteger(variantNum) && variantNum >= 1 && variantNum <= 9999 ? variantNum : 1;

  const garment = typeof r.garment === "string" ? r.garment : "";
  if (!garmentByKey(garment)) return { error: "Unknown garment colour" };

  return { design: { name, date, climate: climate as Climate, dedication, variant, garment } };
}

export function toPlantInput(design: Design): PlantInput {
  const garment = garmentByKey(design.garment) ?? GARMENT_COLORS[0];
  return {
    name: design.name,
    date: design.date,
    climate: design.climate,
    dedication: design.dedication,
    variant: design.variant,
    dark: garment.dark,
  };
}

// ---- compact encoding (URL-safe, used in signed asset URLs and metadata) ----

const b64url = {
  encode(bytes: Uint8Array): string {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    const base = typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64");
    return base.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(str: string): Uint8Array {
    const base = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
    const bin = typeof atob === "function" ? atob(base) : Buffer.from(base, "base64").toString("binary");
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  },
};

export function encodeDesign(d: Design): string {
  const compact = [d.name, d.date, d.climate, d.dedication, d.variant, d.garment];
  return b64url.encode(new TextEncoder().encode(JSON.stringify(compact)));
}

export function decodeDesign(token: string): Design | null {
  try {
    const arr = JSON.parse(new TextDecoder().decode(b64url.decode(token)));
    if (!Array.isArray(arr) || arr.length !== 6) return null;
    const [name, date, climate, dedication, variant, garment] = arr;
    const parsed = parseDesign({ name, date, climate, dedication, variant, garment });
    return parsed.design ?? null;
  } catch {
    return null;
  }
}
