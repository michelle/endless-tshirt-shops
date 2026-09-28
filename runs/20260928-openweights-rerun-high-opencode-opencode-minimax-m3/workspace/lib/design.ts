// types and helpers for a "StarMap Tee" design.
//
// A design is the customer-facing payload:
//   - a meaningful date + place
//   - a printed title (the personal message)
//   - the shirt color and size
//
// We never persist these in a database. They live in:
//   1. the URL (so the preview is shareable / re-generatable)
//   2. Stripe Checkout Session metadata (so the webhook can pull them back)
//
// As long as the URL params are unchanged, the same SVG/PNG is produced.

export type ShirtColor =
  | "white"
  | "black"
  | "navy blue"
  | "athletic grey heather"
  | "asphalt"
  | "dark heather grey"
  | "cream"
  | "natural"
  | "maroon"
  | "red";

export type ShirtSize = "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl";

export interface ShirtSpec {
  color: ShirtColor;
  size: ShirtSize;
}

export interface SkyInput {
  /** ISO date (YYYY-MM-DD). The "moment" the customer wants immortalised. */
  date: string;
  /** Latitude, rounded to 2 decimals - keeps the sky unique but URLs compact. */
  lat: number;
  /** Longitude (negative west of Greenwich), rounded to 2 decimals. */
  lon: number;
  /** Optional place name the customer typed (just for the subtitle text). */
  place?: string;
  /** Personal title that goes at the top of the print (e.g. "the night we met"). */
  title: string;
}

export interface Design extends SkyInput {
  shirt: ShirtSpec;
}

export const SHIRT_COLORS: { value: ShirtColor; label: string; hex: string }[] = [
  { value: "black", label: "Black", hex: "#0c0c10" },
  { value: "navy blue", label: "Navy", hex: "#1c2a4b" },
  { value: "athletic grey heather", label: "Heather Grey", hex: "#888888" },
  { value: "asphalt", label: "Asphalt", hex: "#42464d" },
  { value: "dark heather grey", label: "Smoke", hex: "#5a5d63" },
  { value: "cream", label: "Cream", hex: "#efe7d6" },
  { value: "natural", label: "Natural", hex: "#e2d6bd" },
  { value: "white", label: "White", hex: "#f6f6f6" },
  { value: "maroon", label: "Maroon", hex: "#5d2228" },
  { value: "red", label: "Red", hex: "#bf2a2a" },
];

export const SHIRT_SIZES: { value: ShirtSize; label: string }[] = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
  { value: "2xl", label: "2XL" },
  { value: "3xl", label: "3XL" },
];

export const PRICE_CENTS = Number(
  process.env.NEXT_PUBLIC_PICK_PRICE_CENTS ?? 3499,
);

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate that an unknown blob is a real, acceptable design. */
export function parseDesign(input: unknown): Design | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;

  const date = String(candidate.date ?? "");
  if (!ISO_DATE_RE.test(date)) return null;

  const lat = Number(candidate.lat);
  const lon = Number(candidate.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return null;

  const title = String(candidate.title ?? "").trim();
  if (title.length === 0 || title.length > 80) return null;

  const place =
    typeof candidate.place === "string" && candidate.place.trim().length > 0
      ? candidate.place.slice(0, 80)
      : undefined;

  const shirtRaw = (candidate.shirt ?? {}) as Record<string, unknown>;
  const color = String(shirtRaw.color ?? "");
  const size = String(shirtRaw.size ?? "");
  if (
    !SHIRT_COLORS.some((c) => c.value === color) ||
    !SHIRT_SIZES.some((s) => s.value === size)
  ) {
    return null;
  }

  return {
    date,
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
    place,
    title,
    shirt: { color: color as ShirtColor, size: size as ShirtSize },
  };
}

/** Build the URL-encodable version that the preview and checkout expect. */
export function skyInputOf(d: Design): SkyInput {
  return {
    date: d.date,
    lat: d.lat,
    lon: d.lon,
    place: d.place,
    title: d.title,
  };
}

/**
 * Pack a design into the keys Stripe accepts in Checkout Session metadata
 * (each value max 500 chars; prefixed so we never collide with something
 * Stripe itself might use).
 */
export function designToStripeMetadata(d: Design): Record<string, string> {
  return {
    sm_design_v: "1",
    sm_date: d.date,
    sm_lat: d.lat.toFixed(2),
    sm_lon: d.lon.toFixed(2),
    sm_place: d.place ?? "",
    sm_title: d.title,
    sm_color: d.shirt.color,
    sm_size: d.shirt.size,
  };
}

export function designFromStripeMetadata(
  meta: Record<string, string> | null | undefined,
): Design | null {
  if (!meta || meta.sm_design_v !== "1") return null;
  return parseDesign({
    date: meta.sm_date,
    lat: Number(meta.sm_lat),
    lon: Number(meta.sm_lon),
    place: meta.sm_place || undefined,
    title: meta.sm_title,
    shirt: { color: meta.sm_color, size: meta.sm_size },
  });
}
