export const PRICE_USD_CENTS = 2250; // $22.50 (sale price)
export const COMPARE_AT_USD_CENTS = 3000; // $30.00 struck-through

export const COLOR = "black" as const;

export type StyleKey = "unisex" | "fitted";

export interface StyleConfig {
  label: string;
  description: string;
  /** Prodigi Print API SKU (sandbox + live share the same catalogue) */
  sku: string;
  sizes: string[];
}

export const STYLES: Record<StyleKey, StyleConfig> = {
  unisex: {
    label: "Unisex",
    description: "Gildan 64000 crew neck, boxy fit",
    sku: "GLOBAL-TEE-GIL-64000",
    sizes: ["xs", "s", "m", "l", "xl", "2xl", "3xl"],
  },
  fitted: {
    label: "Fitted",
    description: "Gildan 64V00L ladies' v-neck, tailored fit",
    sku: "GLOBAL-TEE-GIL-64V00L",
    sizes: ["s", "m", "l", "xl", "2xl"],
  },
};

export const DEFAULT_STYLE: StyleKey = "unisex";
export const DEFAULT_SIZE = "m";

export function isValidStyle(value: string): value is StyleKey {
  return value === "unisex" || value === "fitted";
}

export function isValidSize(style: StyleKey, size: string): boolean {
  return STYLES[style].sizes.includes(size);
}

// Countries we currently ship to via Prodigi's sandbox catalogue (kept short
// and English-market-heavy for a credible v1 launch list; expand once real
// fulfillment volumes justify wider shipsTo coverage per-SKU).
export const SHIP_TO_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "IE",
  "DE",
  "FR",
  "NL",
];
