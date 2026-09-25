// Client-safe catalog constants (no server-only imports).

export const SHIRT_SKU = "GLOBAL-TEE-BC-3001"; // Bella+Canvas 3001

export const COLORS = [
  { id: "black", label: "Black", hex: "#1c1c1e", theme: "dark" as const },
  { id: "navy blue", label: "Navy", hex: "#1f2a44", theme: "dark" as const },
  { id: "asphalt", label: "Asphalt", hex: "#4a4a4f", theme: "dark" as const },
  { id: "white", label: "White", hex: "#f5f5f2", theme: "light" as const },
];

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];

export const PRICE_SHIRT_CENTS = 3499;
export const PRICE_SHIPPING_CENTS = 499;
export const CURRENCY = "usd";
