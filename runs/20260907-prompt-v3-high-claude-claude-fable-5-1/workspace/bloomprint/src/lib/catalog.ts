/**
 * Product catalog: one product (the Bloomprint tee) printed on demand by
 * Prodigi on a Bella+Canvas 3001 with DTG.
 */

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";
export const PRODUCT_NAME = "Bloomprint one-of-one botanical tee";

/** Retail price in USD cents. Shipping is included worldwide. */
export const UNIT_PRICE_CENTS = 3900;
export const CURRENCY = "usd";
export const MAX_QUANTITY = 5;

export interface GarmentColor {
  key: string;
  label: string;
  hex: string;
  /** Prodigi attribute value */
  prodigi: string;
  dark: boolean;
}

export const GARMENT_COLORS: GarmentColor[] = [
  { key: "white", label: "White", hex: "#f4f2ee", prodigi: "white", dark: false },
  { key: "natural", label: "Natural", hex: "#e9e2d0", prodigi: "natural", dark: false },
  { key: "cream", label: "Cream", hex: "#f0e6cf", prodigi: "cream", dark: false },
  { key: "baby-blue", label: "Baby blue", hex: "#b8d0e6", prodigi: "baby blue", dark: false },
  { key: "mint", label: "Mint", hex: "#bfe0cf", prodigi: "mint green", dark: false },
  { key: "pink", label: "Pink", hex: "#f2c3cf", prodigi: "pink", dark: false },
  { key: "heather-grey", label: "Heather grey", hex: "#b9b8b6", prodigi: "athletic grey heather", dark: false },
  { key: "mauve", label: "Mauve heather", hex: "#a98a99", prodigi: "mauve heather", dark: true },
  { key: "army", label: "Army", hex: "#5c6146", prodigi: "army", dark: true },
  { key: "navy", label: "Navy", hex: "#1f2a44", prodigi: "navy blue", dark: true },
  { key: "black", label: "Black", hex: "#1c1c1e", prodigi: "black", dark: true },
];

export const SIZES = [
  { key: "xs", label: "XS" },
  { key: "s", label: "S" },
  { key: "m", label: "M" },
  { key: "l", label: "L" },
  { key: "xl", label: "XL" },
  { key: "2xl", label: "2XL" },
  { key: "3xl", label: "3XL" },
] as const;

export type SizeKey = (typeof SIZES)[number]["key"];

export function garmentByKey(key: string): GarmentColor | undefined {
  return GARMENT_COLORS.find((g) => g.key === key);
}

export function isSize(key: string): key is SizeKey {
  return SIZES.some((s) => s.key === key);
}

/**
 * Countries we sell to. Every code here is in the Prodigi shipsTo list for the
 * SKU and supported by Stripe Checkout's shipping address collection.
 */
export const SHIP_COUNTRIES = [
  "US", "CA", "MX", "GB", "IE", "FR", "DE", "NL", "BE", "LU", "ES", "PT", "IT", "AT", "CH",
  "DK", "SE", "NO", "FI", "PL", "CZ", "HU", "GR", "AU", "NZ", "JP", "SG", "HK", "KR",
] as const;
