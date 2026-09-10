/** Product catalogue: one blank, many colours, one price. */

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000"; // Gildan 64000 Softstyle, unisex, 100% ring-spun cotton

export type ShirtColor = {
  key: string; // Prodigi attribute value
  label: string;
  hex: string;
  dark: boolean; // affects text colour in the design
};

export const SHIRT_COLORS: ShirtColor[] = [
  { key: "black", label: "Black", hex: "#1b1b1d", dark: true },
  { key: "white", label: "White", hex: "#f4f3ef", dark: false },
  { key: "navy blue", label: "Navy", hex: "#1f2a44", dark: true },
  { key: "sport grey", label: "Sport Grey", hex: "#b8b8b6", dark: false },
  { key: "dark heather grey", label: "Dark Heather", hex: "#4a4b4e", dark: true },
  { key: "forest green", label: "Forest", hex: "#20402e", dark: true },
  { key: "maroon", label: "Maroon", hex: "#5b1f2b", dark: true },
  { key: "sand", label: "Sand", hex: "#d9c9a8", dark: false },
];

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export const PRICE_CENTS = 3800; // $38.00 per shirt
export const SHIPPING_CENTS = 695; // flat, worldwide
export const CURRENCY = "usd";
export const MAX_QTY = 10;

/** Countries Prodigi ships this blank to AND Stripe Checkout accepts. Curated for sane delivery times. */
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ",
  "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI", "PT", "PL", "CZ", "GR", "HU", "RO", "SK", "SI", "HR", "LT", "LV", "EE", "LU",
  "JP", "SG", "HK", "KR", "MX", "BR", "ZA", "AE", "IL",
] as const;

export function findColor(key: string): ShirtColor | undefined {
  return SHIRT_COLORS.find((c) => c.key === key);
}

export function isSize(s: string): s is Size {
  return (SIZES as readonly string[]).includes(s);
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
