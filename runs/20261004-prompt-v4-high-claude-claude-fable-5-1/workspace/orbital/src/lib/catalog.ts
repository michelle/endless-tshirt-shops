/** Garment catalogue: Prodigi SKU, colours, sizes, prices (USD cents). */

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000"; // Gildan 64000 Softstyle unisex tee, DTG front print
export const PRINT_WIDTH_PX = 4665; // Prodigi front print area for this SKU, ~300 dpi
export const PRINT_HEIGHT_PX = 5844;

export const SHIRT_PRICE_CENTS = 3400;

export type ShirtColor = {
  id: string;
  /** Exact Prodigi attribute value */
  prodigi: string;
  label: string;
  hex: string;
  /** true if a light garment, so default ink should be dark */
  light: boolean;
  heather?: boolean;
};

export const SHIRT_COLORS: ShirtColor[] = [
  { id: "black", prodigi: "black", label: "Black", hex: "#141416", light: false },
  { id: "navy", prodigi: "navy blue", label: "Navy", hex: "#1d2440", light: false },
  { id: "forest", prodigi: "forest green", label: "Forest", hex: "#213c2e", light: false },
  { id: "maroon", prodigi: "maroon", label: "Maroon", hex: "#4e1f2a", light: false },
  { id: "charcoal", prodigi: "charcoal", label: "Charcoal", hex: "#3b3b3f", light: false },
  { id: "military", prodigi: "military green", label: "Military", hex: "#5b5d45", light: false },
  { id: "sport-grey", prodigi: "sport grey", label: "Sport grey", hex: "#b9b9b7", light: true, heather: true },
  { id: "sand", prodigi: "sand", label: "Sand", hex: "#dccbab", light: true },
  { id: "natural", prodigi: "natural", label: "Natural", hex: "#e9e2d0", light: true },
  { id: "white", prodigi: "white", label: "White", hex: "#f6f6f4", light: true },
];

export type ShirtSize = { id: string; prodigi: string; label: string };
export const SHIRT_SIZES: ShirtSize[] = [
  { id: "xs", prodigi: "xs", label: "XS" },
  { id: "s", prodigi: "s", label: "S" },
  { id: "m", prodigi: "m", label: "M" },
  { id: "l", prodigi: "l", label: "L" },
  { id: "xl", prodigi: "xl", label: "XL" },
  { id: "2xl", prodigi: "2xl", label: "2XL" },
  { id: "3xl", prodigi: "3xl", label: "3XL" },
  { id: "4xl", prodigi: "4xl", label: "4XL" },
  { id: "5xl", prodigi: "5xl", label: "5XL" },
];

export type ShippingOption = {
  id: string;
  label: string;
  cents: number;
  prodigiMethod: "Standard" | "Express";
  minDays: number;
  maxDays: number;
};
export const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: "standard", label: "Standard shipping", cents: 695, prodigiMethod: "Standard", minDays: 6, maxDays: 12 },
  { id: "express", label: "Express shipping", cents: 1995, prodigiMethod: "Express", minDays: 3, maxDays: 6 },
];

/** Countries we sell to (all served by Prodigi for this SKU). */
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "AT", "ES", "PT", "IT",
  "SE", "DK", "FI", "NO", "CH", "PL", "CZ", "JP", "SG", "HK", "MX", "BR",
] as const;

export function shirtById(id: string): ShirtColor {
  return SHIRT_COLORS.find((c) => c.id === id) ?? SHIRT_COLORS[0];
}
export function sizeById(id: string): ShirtSize {
  return SHIRT_SIZES.find((s) => s.id === id) ?? SHIRT_SIZES[3];
}
