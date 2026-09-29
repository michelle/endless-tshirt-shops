// Pricing + shipping (USD cents). Prodigi sandbox cost is roughly $11–16 per tee + $5–33 shipping.
export const PRICE_CENTS = 3800;
export const CURRENCY = "usd";
export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001"; // Bella + Canvas 3001 unisex tee

export const SHIPPING = {
  Standard: { label: "Standard shipping", cents: 800, min: 5, max: 12 },
  Express: { label: "Express shipping", cents: 3500, min: 2, max: 6 },
} as const;
export type ShippingMethod = keyof typeof SHIPPING;

export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "LU", "AT", "CH",
  "ES", "PT", "IT", "SE", "DK", "NO", "FI", "PL", "CZ",
] as const;

export const MAX_QTY = 10;
