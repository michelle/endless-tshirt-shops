// Central configuration and shared types for Pawtraits.

export const BRAND = "Pawtraits";

// Prodigi product SKU for the Gildan 5000 unisex heavy cotton tee.
export const PRODIGI_SKU = "GLOBAL-TEE-GIL-5000";

// Base price (USD) for a single customized tee.
export const BASE_PRICE_USD = 29.99;

// Illustration styles offered to the customer. Each maps to a CSS filter used
// for the live preview; in production these would drive a real image pipeline.
export const STYLES = [
  { id: "watercolor", label: "Watercolor", filter: "saturate(1.15) contrast(0.92) brightness(1.05)" },
  { id: "minimalist", label: "Minimalist line", filter: "grayscale(1) contrast(1.25) brightness(1.05)" },
  { id: "popart", label: "Pop art", filter: "saturate(2.2) contrast(1.35)" },
  { id: "vintage", label: "Vintage sketch", filter: "sepia(0.45) contrast(1.05) brightness(1.02)" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

// Shirt colors offered, mapped to Prodigi's `color` attribute values.
export const COLORS = [
  { id: "black", label: "Black", prodigi: "black", hex: "#1a1a1a" },
  { id: "white", label: "White", prodigi: "white", hex: "#f5f5f5" },
  { id: "navy", label: "Navy", prodigi: "navy blue", hex: "#1e2a4a" },
  { id: "heather", label: "Heather Grey", prodigi: "heather grey", hex: "#9aa0a6" },
  { id: "charcoal", label: "Charcoal", prodigi: "charcoal", hex: "#3a3a3a" },
  { id: "sportgrey", label: "Sport Grey", prodigi: "sport grey", hex: "#8b8f94" },
] as const;

export type ColorId = (typeof COLORS)[number]["id"];

// Sizes offered, mapped to Prodigi's `size` attribute values.
export const SIZES = [
  { id: "s", label: "S", prodigi: "s" },
  { id: "m", label: "M", prodigi: "m" },
  { id: "l", label: "L", prodigi: "l" },
  { id: "xl", label: "XL", prodigi: "xl" },
  { id: "2xl", label: "2XL", prodigi: "2xl" },
] as const;

export type SizeId = (typeof SIZES)[number]["id"];

export interface Customization {
  imageUrl: string;
  style: StyleId;
  color: ColorId;
  size: SizeId;
  petName: string;
}

export function styleById(id: string) {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}
export function colorById(id: string) {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}
export function sizeById(id: string) {
  return SIZES.find((s) => s.id === id) ?? SIZES[2];
}
