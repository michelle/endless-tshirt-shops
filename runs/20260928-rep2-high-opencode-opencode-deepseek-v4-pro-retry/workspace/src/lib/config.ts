// Product catalog and shared configuration.

export const SHIRT_COLORS = [
  { key: "black", label: "Black", hex: "#1a1a1a" },
  { key: "navy blue", label: "Navy", hex: "#1c2a4a" },
  { key: "charcoal", label: "Charcoal", hex: "#3a3a3a" },
  { key: "dark heather grey", label: "Dark Heather", hex: "#4a4a4a" },
  { key: "white", label: "White", hex: "#f5f5f5" },
  { key: "natural", label: "Natural", hex: "#e8dcc8" },
  { key: "sport grey", label: "Sport Grey", hex: "#9aa0a6" },
  { key: "navy blue heather", label: "Navy Heather", hex: "#2a3550" },
] as const;

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;

export const BASE_PRICE_USD = 34.99;

// Prodigi global SKU for the Gildan 64000 Softstyle tee. Color and size are
// passed as item attributes rather than encoded in the SKU.
export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";

export const PRODIGI_SANDBOX = "https://api.sandbox.prodigi.com/v4.0";
export const PRODIGI_LIVE = "https://api.prodigi.com/v4.0";

export function prodigiBaseUrl(): string {
  return process.env.PRODIGI_LIVE === "true" ? PRODIGI_LIVE : PRODIGI_SANDBOX;
}

export interface Customization {
  date: string;
  time?: string;
  lat: number;
  lng: number;
  locationLabel: string;
  title: string;
  names: string;
  message?: string;
  shirtColor: string;
  size: string;
  quantity: number;
}

export function validateCustomization(c: Partial<Customization>): string | null {
  if (!c.date || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return "A valid date is required.";
  if (typeof c.lat !== "number" || Number.isNaN(c.lat) || c.lat < -90 || c.lat > 90)
    return "A valid latitude is required.";
  if (typeof c.lng !== "number" || Number.isNaN(c.lng) || c.lng < -180 || c.lng > 180)
    return "A valid longitude is required.";
  if (!c.title || !c.title.trim()) return "A title is required.";
  if (!c.names || !c.names.trim()) return "Names are required.";
  if (!c.locationLabel || !c.locationLabel.trim()) return "A location is required.";
  if (!c.shirtColor) return "A shirt color is required.";
  if (!c.size) return "A shirt size is required.";
  const q = c.quantity ?? 1;
  if (!Number.isInteger(q) || q < 1 || q > 10) return "Quantity must be between 1 and 10.";
  return null;
}
