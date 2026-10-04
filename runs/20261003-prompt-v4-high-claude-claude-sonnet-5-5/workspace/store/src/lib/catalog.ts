// Product catalog: shirt colors, inks, sizes, pricing. Shared by client and server.

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001"; // Bella + Canvas 3001 unisex tee, 100% cotton
export const PRICE_CENTS = 3600;
export const MAX_QTY_PER_ITEM = 10;
export const MAX_ITEMS_PER_ORDER = 8;

export type ShirtColor = { id: string; label: string; hex: string; prodigi: string; dark: boolean };

// Only colors with full S–3XL availability from Prodigi's US-shipping variants.
export const SHIRT_COLORS: ShirtColor[] = [
  { id: "black", label: "Black", hex: "#16171a", prodigi: "black", dark: true },
  { id: "dhg", label: "Dark Heather", hex: "#3d3f44", prodigi: "dark heather grey", dark: true },
  { id: "maroon", label: "Maroon", hex: "#5b2030", prodigi: "maroon", dark: true },
  { id: "military", label: "Military Green", hex: "#4a5036", prodigi: "military green", dark: true },
  { id: "natural", label: "Natural", hex: "#eadfc9", prodigi: "natural", dark: false },
  { id: "white", label: "White", hex: "#f6f5f1", prodigi: "white", dark: false },
];

export type Ink = { id: string; label: string; main: string; accent: string };

export const INKS: Ink[] = [
  { id: "moonlight", label: "Moonlight", main: "#f4efe0", accent: "#f2c14e" },
  { id: "ice", label: "Ice", main: "#e4f1ff", accent: "#79c2ff" },
  { id: "rose", label: "Rosé", main: "#fde9ec", accent: "#ff9db4" },
  { id: "gilt", label: "Gilt", main: "#f2c14e", accent: "#fff3d0" },
  { id: "mint", label: "Aurora", main: "#dff7ee", accent: "#6fe3bd" },
  { id: "midnight", label: "Midnight", main: "#14213d", accent: "#b7791f" },
  { id: "ink", label: "Ink", main: "#111111", accent: "#b3341f" },
  { id: "deepsea", label: "Deep Sea", main: "#0b3c5d", accent: "#c96a14" },
];

export const SIZES = ["s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];
export const SIZE_LABEL: Record<Size, string> = { s: "S", m: "M", l: "L", xl: "XL", "2xl": "2XL", "3xl": "3XL" };

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Inks that stay legible on a given shirt color. */
export function inksFor(shirtId: string): Ink[] {
  const shirt = SHIRT_COLORS.find((s) => s.id === shirtId) ?? SHIRT_COLORS[0];
  return INKS.filter((i) => contrast(i.main, shirt.hex) >= 6 && contrast(i.accent, shirt.hex) >= 4);
}

export const SHIP_COUNTRIES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom", AU: "Australia", NZ: "New Zealand", IE: "Ireland",
  DE: "Germany", FR: "France", ES: "Spain", IT: "Italy", NL: "Netherlands", BE: "Belgium", AT: "Austria",
  CH: "Switzerland", SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", PT: "Portugal", PL: "Poland",
  CZ: "Czechia", GR: "Greece", HU: "Hungary", JP: "Japan", KR: "South Korea", SG: "Singapore", HK: "Hong Kong",
  MX: "Mexico", BR: "Brazil", ZA: "South Africa", AE: "United Arab Emirates", IL: "Israel",
};

export const money = (cents: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(cents / 100);
