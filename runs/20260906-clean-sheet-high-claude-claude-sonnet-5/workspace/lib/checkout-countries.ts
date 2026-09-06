// Curated subset of Stripe's supported shipping countries that also appear
// in Prodigi's shipsTo list for GLOBAL-TEE-GIL-64000. Kept deliberately
// conservative (stable currencies, no sanctions edge cases) for a demo store.
export const ALLOWED_SHIPPING_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ",
  "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH",
  "SE", "NO", "DK", "FI", "PT", "PL", "CZ", "GR",
  "HU", "RO", "SK", "SI", "HR", "BG", "EE", "LV",
  "LT", "LU", "MT", "CY",
  "JP", "SG", "HK", "KR", "AE", "MX",
] as const;
