// Product catalog: the blank we print on, colors, sizes, prices and shipping.
// Prices are always computed server-side from this file; the client never sends a price.

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001"; // Bella + Canvas 3001 unisex tee, DTG front print
export const BLANK_LABEL = "Bella+Canvas 3001 · 100% combed cotton";

export type ShirtColor = {
  id: string;
  label: string;
  hex: string;
  prodigi: string; // Prodigi "color" attribute value
  dark: boolean; // dark garments get cream ink instead of dark ink
};

export const SHIRT_COLORS: ShirtColor[] = [
  { id: "white", label: "White", hex: "#f7f6f2", prodigi: "white", dark: false },
  { id: "natural", label: "Natural", hex: "#ece2cc", prodigi: "natural", dark: false },
  { id: "heather", label: "Athletic Heather", hex: "#bcbbb7", prodigi: "athletic grey heather", dark: false },
  { id: "black", label: "Black", hex: "#1d1d1f", prodigi: "black", dark: true },
  { id: "navy", label: "Navy", hex: "#212b45", prodigi: "navy blue", dark: true },
  { id: "military", label: "Military Green", hex: "#4a5037", prodigi: "military green", dark: true },
  { id: "maroon", label: "Maroon", hex: "#5a1f2a", prodigi: "maroon", dark: true },
];

export type Size = { id: string; label: string; prodigi: string; priceCents: number };

export const SIZES: Size[] = [
  { id: "xs", label: "XS", prodigi: "xs", priceCents: 3900 },
  { id: "s", label: "S", prodigi: "s", priceCents: 3900 },
  { id: "m", label: "M", prodigi: "m", priceCents: 3900 },
  { id: "l", label: "L", prodigi: "l", priceCents: 3900 },
  { id: "xl", label: "XL", prodigi: "xl", priceCents: 3900 },
  { id: "2xl", label: "2XL", prodigi: "2xl", priceCents: 4300 },
  { id: "3xl", label: "3XL", prodigi: "3xl", priceCents: 4300 },
];

export type ShippingOption = {
  id: "standard" | "express";
  label: string;
  prodigiMethod: "Standard" | "Express";
  amountCents: number;
  minDays: number;
  maxDays: number;
};

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: "standard", label: "Standard shipping", prodigiMethod: "Standard", amountCents: 600, minDays: 5, maxDays: 10 },
  { id: "express", label: "Express shipping", prodigiMethod: "Express", amountCents: 3500, minDays: 2, maxDays: 5 },
];

// Countries we let Stripe Checkout collect addresses for. All are served by Prodigi for this SKU.
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "ES", "IT", "PT",
  "AT", "CH", "SE", "DK", "NO", "FI", "PL", "JP", "SG",
] as const;

export const MAX_CART_LINES = 10;
export const MAX_QTY = 10;

export const colorById = (id: string) => SHIRT_COLORS.find((c) => c.id === id);
export const sizeById = (id: string) => SIZES.find((s) => s.id === id);

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
