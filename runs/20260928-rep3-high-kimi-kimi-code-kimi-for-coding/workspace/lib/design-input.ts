// Shared design-input types + server-side validation.

export interface DesignInput {
  label: string;
  lat: number;
  lon: number;
  /** UTC instant, ms */
  ms: number;
  tz: string;
  caption?: string;
  color: string; // Prodigi color attribute
  size: string; // Prodigi size attribute
}

export interface DesignTokenPayload extends DesignInput {
  v: 1;
  /** true = light ink (dark shirt) */
  dark: boolean;
}

const SIZES = new Set(["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"]);
const COLORS = new Set([
  "black", "navy blue", "white", "athletic grey heather", "burgundy",
  "military green", "cream", "baby blue", "pink",
]);
// colors where light ink artwork reads best (i.e. dark-ish garment)
export const DARK_SHIRT_COLORS = new Set([
  "black", "navy blue", "athletic grey heather", "burgundy", "military green",
]);

export const PRICE_CENTS = Number(process.env.PRICE_CENTS ?? 3999);

export function validateDesign(raw: unknown): { ok: true; value: DesignInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid payload" };
  const o = raw as Record<string, unknown>;
  const label = String(o.label ?? "").trim();
  if (!label || label.length > 48) return { ok: false, error: "Place label must be 1–48 characters." };
  if (/[<>]/.test(label)) return { ok: false, error: "Place label contains invalid characters." };
  const lat = Number(o.lat), lon = Number(o.lon);
  if (!Number.isFinite(lat) || lat < -89 || lat > 89) return { ok: false, error: "Latitude out of range." };
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { ok: false, error: "Longitude out of range." };
  const ms = Number(o.ms);
  if (!Number.isFinite(ms) || ms < Date.UTC(1900, 0, 1) || ms > Date.UTC(2100, 0, 1)) {
    return { ok: false, error: "Date must be between 1900 and 2099." };
  }
  const tz = String(o.tz ?? "");
  if (!/^[A-Za-z0-9_+\/-]+$/.test(tz) || tz.length > 64) return { ok: false, error: "Invalid timezone." };
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { ok: false, error: "Invalid timezone." };
  }
  const caption = String(o.caption ?? "").trim().slice(0, 60);
  const color = String(o.color ?? "").toLowerCase();
  if (!COLORS.has(color)) return { ok: false, error: "Unsupported shirt color." };
  const size = String(o.size ?? "").toLowerCase();
  if (!SIZES.has(size)) return { ok: false, error: "Unsupported size." };
  return { ok: true, value: { label, lat, lon, ms, tz, caption, color, size } };
}
