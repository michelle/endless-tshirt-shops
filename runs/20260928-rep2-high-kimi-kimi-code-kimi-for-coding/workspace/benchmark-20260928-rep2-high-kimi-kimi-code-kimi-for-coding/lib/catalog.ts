// Product + offer configuration for Echostitch.
// Garment: Bella + Canvas 3001 via Prodigi SKU GLOBAL-TEE-BC-3001 (DTG, front print).

export interface GarmentColor {
  /** Prodigi attribute string — must match the catalog exactly. */
  prodigi: string;
  label: string;
  /** Approximate hex for preview swatches only. */
  swatch: string;
  sizes: string[];
}

export const SKU = "GLOBAL-TEE-BC-3001";

export const GARMENT_COLORS: GarmentColor[] = [
  { prodigi: "black", label: "Black", swatch: "#202124", sizes: ["xs", "s", "m", "l", "xl", "2xl", "3xl"] },
  { prodigi: "white", label: "White", swatch: "#f6f4ef", sizes: ["xs", "s", "m", "l", "xl", "2xl", "3xl"] },
  { prodigi: "navy blue", label: "Navy", swatch: "#2c3a57", sizes: ["s", "m", "l", "xl", "2xl", "3xl"] },
  { prodigi: "athletic grey heather", label: "Heather Grey", swatch: "#a7a9ad", sizes: ["s", "m", "l", "xl", "2xl", "3xl"] },
  { prodigi: "cream", label: "Cream", swatch: "#efe7d3", sizes: ["xs", "s", "m", "l", "xl", "2xl", "3xl"] },
  { prodigi: "berry", label: "Berry", swatch: "#8e4a63", sizes: ["s", "m", "l", "xl", "2xl", "3xl"] },
];

export const INK_COLORS: { hex: string; label: string }[] = [
  { hex: "#232323", label: "Charcoal" },
  { hex: "#fbfbf8", label: "White" },
  { hex: "#b3382e", label: "Crimson" },
  { hex: "#245a8d", label: "Deep Blue" },
  { hex: "#1e7a6f", label: "Teal" },
  { hex: "#c79a2a", label: "Mustard" },
];

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export const WAVEFORM_STYLES = [
  { id: "line", label: "Pulse line" },
  { id: "fill", label: "Mountain fill" },
] as const;
export type WaveformStyle = (typeof WAVEFORM_STYLES)[number]["id"];

export const BASE_PRICE_CENTS = 3600;
export const BIG_SIZE_SURCHARGE_CENTS = 300; // 2xl / 3xl
export const BIG_SIZES: Size[] = ["2xl", "3xl"];

export function priceCents(size: Size): number {
  return BASE_PRICE_CENTS + (BIG_SIZES.includes(size) ? BIG_SIZE_SURCHARGE_CENTS : 0);
}

export function sizeLabel(size: Size): string {
  return size.toUpperCase();
}
