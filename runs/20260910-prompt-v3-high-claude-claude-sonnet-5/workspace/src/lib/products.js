// Product / catalog config shared by client & server.
// SKU verified against the Prodigi sandbox catalog:
// GLOBAL-TEE-GIL-64000 = Unisex Softstyle T-shirt, Gildan 64000.

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";

export const SHIRT_COLORS = [
  { key: "black", name: "Black", hex: "#141414", prodigi: "black", dark: true },
  { key: "white", name: "White", hex: "#f7f6f2", prodigi: "white", dark: false },
  { key: "navy", name: "Navy Blue", hex: "#1c2a44", prodigi: "navy blue", dark: true },
  { key: "sportgrey", name: "Sport Grey", hex: "#9b9b9b", prodigi: "sport grey", dark: false },
  { key: "forest", name: "Forest Green", hex: "#28402f", prodigi: "forest green", dark: true },
  { key: "maroon", name: "Maroon", hex: "#5c1f2e", prodigi: "maroon", dark: true },
  { key: "royal", name: "Royal Blue", hex: "#28429c", prodigi: "royal blue", dark: true },
  { key: "natural", name: "Natural", hex: "#e7dfc9", prodigi: "natural", dark: false },
];

export function getShirtColor(key) {
  return SHIRT_COLORS.find((c) => c.key === key) || SHIRT_COLORS[0];
}

export const SIZES = [
  { key: "xs", label: "XS", tier: "standard" },
  { key: "s", label: "S", tier: "standard" },
  { key: "m", label: "M", tier: "standard" },
  { key: "l", label: "L", tier: "standard" },
  { key: "xl", label: "XL", tier: "standard" },
  { key: "2xl", label: "2XL", tier: "extended" },
  { key: "3xl", label: "3XL", tier: "extended" },
  { key: "4xl", label: "4XL", tier: "extended" },
  { key: "5xl", label: "5XL", tier: "extended" },
];

export function getSize(key) {
  return SIZES.find((s) => s.key === key) || SIZES[2];
}

// Authoritative server-side pricing (USD, cents). Never trust client-sent prices.
export const PRICE_STANDARD_CENTS = 3200; // sizes xs-xl
export const PRICE_EXTENDED_CENTS = 3600; // sizes 2xl-5xl
export const SHIPPING_FLAT_CENTS = 695; // flat "Standard" domestic shipping

export function priceForSize(sizeKey) {
  const size = getSize(sizeKey);
  return size.tier === "extended" ? PRICE_EXTENDED_CENTS : PRICE_STANDARD_CENTS;
}

export const MAX_QTY_PER_ITEM = 10;
export const MAX_ITEMS_PER_ORDER = 12;
export const PHRASE_MAX_LEN = 24;
export const SUBTITLE_MAX_LEN = 30;

// Only US for the MVP: pricing/shipping cost were calibrated against a US
// Prodigi quote. Expanding to other countries is a follow-up (see README).
export const ALLOWED_SHIP_COUNTRIES = ["US"];
