// Product catalog: one garment, many skies. Prices are in cents (USD).

export const PRODUCT = {
  sku: "GLOBAL-TEE-BC-3001",
  name: "Overhead Tee",
  garment: "Bella+Canvas 3001 · 100% combed cotton · unisex fit",
  priceCents: 3800,
  currency: "usd",
} as const;

export const SHIPPING = {
  label: "Tracked standard shipping",
  amountCents: 795,
  prodigiMethod: "Standard",
  minDays: 5,
  maxDays: 12,
} as const;

export type ShirtColor = {
  key: string;
  label: string;
  prodigi: string; // Prodigi colour attribute value
  hex: string; // on-screen approximation of the garment
  dark: boolean; // dark garments get light ink and vice versa
};

export const SHIRT_COLORS: ShirtColor[] = [
  { key: "black", label: "Midnight Black", prodigi: "black", hex: "#16171b", dark: true },
  { key: "navy", label: "Deep Navy", prodigi: "navy blue", hex: "#1f2a44", dark: true },
  { key: "asphalt", label: "Asphalt", prodigi: "asphalt", hex: "#45474d", dark: true },
  { key: "army", label: "Army Green", prodigi: "army", hex: "#4d5140", dark: true },
  { key: "maroon", label: "Maroon", prodigi: "maroon", hex: "#5b2230", dark: true },
  { key: "natural", label: "Natural", prodigi: "natural", hex: "#ece3d0", dark: false },
  { key: "white", label: "Paper White", prodigi: "white", hex: "#f6f6f4", dark: false },
];

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export const MAX_QTY_PER_LINE = 10;
export const MAX_CART_LINES = 10;

// Countries we ship to (Prodigi global tee variants cover all of these).
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "LU", "AT",
  "CH", "ES", "PT", "IT", "DK", "SE", "NO", "FI", "PL", "CZ",
] as const;

export function colorByKey(key: string): ShirtColor {
  return SHIRT_COLORS.find((c) => c.key === key) ?? SHIRT_COLORS[0];
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
