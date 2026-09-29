// Central configuration for the Stellar store.

export const SITE_NAME = "Stellar";
export const SITE_TAGLINE = "Wear the sky from the night that mattered.";

// Prodigi product (Bella + Canvas 3001 unisex tee, DTG).
export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";

// Base price in USD (shipping is added by Prodigi at fulfilment time; we
// charge a flat rate at checkout to keep the customer experience simple).
export const BASE_PRICE_USD = 34.0;
export const SHIPPING_USD = 6.0;

// Shirt colours offered in the customizer. These map to Prodigi `color`
// attribute values for GLOBAL-TEE-BC-3001.
export const SHIRT_COLORS: { id: string; label: string; hex: string; ink: "light" | "dark" }[] = [
  { id: "black", label: "Black", hex: "#1a1a1a", ink: "light" },
  { id: "navy blue", label: "Navy", hex: "#1f2a44", ink: "light" },
  { id: "white", label: "White", hex: "#f4f4f4", ink: "dark" },
  { id: "natural", label: "Natural", hex: "#e8e0d0", ink: "dark" },
  { id: "silver", label: "Silver", hex: "#c9c9c9", ink: "dark" },
];

export const SHIRT_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;

export function colorById(id: string) {
  return SHIRT_COLORS.find((c) => c.id === id) ?? SHIRT_COLORS[0];
}

export function sizeLabel(size: string) {
  return size.toUpperCase();
}
