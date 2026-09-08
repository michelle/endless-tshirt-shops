// Product catalog. SKUs and colors are confirmed available in the Prodigi
// sandbox catalog (GET /v4.0/products/{sku}).

export type StyleKey = "classic" | "heavyweight";

export const STYLES: Record<
  StyleKey,
  { label: string; description: string; sku: string; priceCents: number }
> = {
  classic: {
    label: "Classic Tee",
    description: "Softstyle, fitted, midweight cotton",
    sku: "GLOBAL-TEE-GIL-64000",
    priceCents: 3200,
  },
  heavyweight: {
    label: "Heavyweight Tee",
    description: "Heavy cotton, boxier unisex fit",
    sku: "GLOBAL-TEE-GIL-5000",
    priceCents: 3600,
  },
};

export type ColorKey = "black" | "white" | "navy blue" | "sport grey";

export const COLORS: { key: ColorKey; label: string; swatch: string }[] = [
  { key: "black", label: "Black", swatch: "#111111" },
  { key: "white", label: "White", swatch: "#f8f8f6" },
  { key: "navy blue", label: "Navy", swatch: "#1b2743" },
  { key: "sport grey", label: "Sport Grey", swatch: "#9a9a9c" },
];

export const SIZES = ["s", "m", "l", "xl", "2xl"] as const;
export type SizeKey = (typeof SIZES)[number];

export const SHIPPING_FLAT_CENTS = 695;
export const CURRENCY = "usd";

export const COUNTRIES: { code: string; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IE", label: "Ireland" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
];

export function priceFor(style: StyleKey): number {
  return STYLES[style].priceCents;
}
