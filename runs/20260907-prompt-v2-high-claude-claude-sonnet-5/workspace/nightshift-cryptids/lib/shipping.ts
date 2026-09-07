export const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "SE", label: "Sweden" },
  { code: "JP", label: "Japan" },
  { code: "MX", label: "Mexico" },
];

export const SHIPPING_METHODS = [
  { key: "Standard" as const, label: "Standard (7–10 days)", price: 6.95 },
  { key: "Express" as const, label: "Express (2–4 days)", price: 14.95 },
];
