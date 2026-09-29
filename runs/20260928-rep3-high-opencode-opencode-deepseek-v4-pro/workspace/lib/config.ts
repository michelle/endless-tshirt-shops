// Shared configuration: product catalog, pricing, and the canonical design
// shape that travels from the customizer through Stripe metadata to Prodigi.

export const PRODUCT_SKU = "GLOBAL-TEE-GIL-64000"; // Gildan 64000 Softstyle (DTG)

export const SHIRT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "black", label: "Black", hex: "#1a1a1a" },
  { id: "navy blue", label: "Navy", hex: "#1f2a44" },
  { id: "dark heather grey", label: "Charcoal", hex: "#3a3a3a" },
  { id: "charcoal", label: "Graphite", hex: "#2e2e2e" },
  { id: "forest green", label: "Forest", hex: "#1e3a2a" },
  { id: "maroon", label: "Maroon", hex: "#4a1f2a" },
  { id: "royal blue", label: "Royal", hex: "#1f3a6e" },
  { id: "sport grey", label: "Heather Grey", hex: "#8a8a8a" },
  { id: "natural", label: "Natural", hex: "#e8e0d0" },
  { id: "white", label: "White", hex: "#f5f5f5" },
];

export const SHIRT_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"];

export const BASE_PRICE_USD = 34;
export const SHIPPING_USD = 6;

export interface DesignParams {
  date: string; // YYYY-MM-DD
  lat: number;
  lng: number;
  locationName: string;
  title: string;
  subtitle?: string;
  time?: string;
  color: string; // Prodigi color id
  size: string; // Prodigi size id
  quantity: number;
}

export function designToQuery(d: DesignParams): Record<string, string> {
  const q: Record<string, string> = {
    date: d.date,
    lat: String(d.lat),
    lng: String(d.lng),
    loc: d.locationName,
    title: d.title,
  };
  if (d.subtitle) q.sub = d.subtitle;
  if (d.time) q.time = d.time;
  return q;
}

export function designFromQuery(q: Record<string, string | string[] | undefined>): {
  date: string;
  lat: number;
  lng: number;
  locationName: string;
  title: string;
  subtitle?: string;
  time?: string;
} {
  const g = (k: string) => {
    const v = q[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    date: g("date") || "2000-01-01",
    lat: parseFloat(g("lat") || "0"),
    lng: parseFloat(g("lng") || "0"),
    locationName: g("loc") || "",
    title: g("title") || "The Night We Met",
    subtitle: g("sub") || undefined,
    time: g("time") || undefined,
  };
}
