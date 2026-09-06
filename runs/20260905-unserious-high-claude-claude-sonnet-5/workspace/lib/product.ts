// The one and only product datetime.store has ever sold.
//
// Prodigi SKU GLOBAL-TEE-GIL-64000 is a real, orderable Gildan 64000 unisex
// softstyle tee. We only expose a small, curated slice of its actual
// color/size attributes so the joke stays legible.

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";

export const PRICE_USD = 22.5;
export const PRICE_CENTS = Math.round(PRICE_USD * 100);
export const LIST_PRICE_USD = 30;

export const COLORS = [
  { id: "black", label: "Void Black", hex: "#0a0a0a", ink: "#f5f3ee" },
  { id: "white", label: "Blank Space", hex: "#f5f3ee", ink: "#0a0a0a" },
  { id: "navy blue", label: "Deep Time Navy", hex: "#1b2436", ink: "#f5f3ee" },
] as const;

export type ColorId = (typeof COLORS)[number]["id"];

export const SIZES = ["s", "m", "l", "xl", "2xl"] as const;
export type Size = (typeof SIZES)[number];

export function isColor(v: unknown): v is ColorId {
  return typeof v === "string" && COLORS.some((c) => c.id === v);
}

export function isSize(v: unknown): v is Size {
  return typeof v === "string" && (SIZES as readonly string[]).includes(v);
}

export function colorInfo(id: ColorId) {
  return COLORS.find((c) => c.id === id)!;
}

// Format a frozen epoch-millisecond timestamp the way it appears on the
// shirt: raw milliseconds, because a human date would be far too readable.
export function formatStampForPrint(stampMs: number) {
  return String(Math.trunc(stampMs));
}

export function formatStampForHumans(stampMs: number) {
  const d = new Date(stampMs);
  return d.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}
