import { z } from "zod";

/** Shirt colours we offer (Bella+Canvas 3001 attribute values) and how to render them. */
export const SHIRT_COLORS = {
  black: { label: "Black", hex: "#17171a", ink: "#ffffff", dark: true },
  "navy blue": { label: "Navy", hex: "#1d2440", ink: "#ffffff", dark: true },
  "dark heather grey": { label: "Heather Grey", hex: "#4a4b50", ink: "#ffffff", dark: true },
  "military green": { label: "Military Green", hex: "#4b5340", ink: "#ffffff", dark: true },
  maroon: { label: "Maroon", hex: "#5a1e2a", ink: "#ffffff", dark: true },
  white: { label: "White", hex: "#f4f3ef", ink: "#1b1b1f", dark: false },
  natural: { label: "Natural", hex: "#e8e0cf", ink: "#1b1b1f", dark: false },
} as const;
export type ShirtColor = keyof typeof SHIRT_COLORS;

export const ACCENTS = {
  gold: { label: "Solar Gold", hex: "#f1b64a" },
  coral: { label: "Coral", hex: "#ff6f59" },
  mint: { label: "Mint", hex: "#7fd9bd" },
  sky: { label: "Sky", hex: "#79bfff" },
  rose: { label: "Rose", hex: "#f08fb0" },
  mono: { label: "Monochrome", hex: "" }, // same as ink
} as const;
export type Accent = keyof typeof ACCENTS;

export const STYLES = {
  classic: { label: "Classic", blurb: "Orbits, planets and your caption." },
  annotated: { label: "Annotated", blurb: "Classic plus small planet labels." },
  minimal: { label: "Minimal", blurb: "Dashed orbits, no halos. Lighter on the shirt." },
} as const;
export type Style = keyof typeof STYLES;

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export const PRODUCT = {
  sku: "GLOBAL-TEE-BC-3001",
  name: "Orbitday Tee",
  garment: "Bella+Canvas 3001 unisex, 100% ring-spun cotton",
  priceCents: 3600,
  shippingCents: 595,
  currency: "usd",
  // Prodigi front print area for this SKU at 300 DPI
  printPx: { w: 4680, h: 5790 },
  printIn: { w: 15.6, h: 19.3 },
};

export const designSchema = z.object({
  v: z.literal(1).default(1),
  /** ISO date YYYY-MM-DD, 1900–2050 (range of the planetary model we use) */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const [y, m, d] = s.split("-").map(Number);
      if (y < 1900 || y > 2050 || m < 1 || m > 12 || d < 1 || d > 31) return false;
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    }, "Date must be a valid day between 1900 and 2050"),
  name: z.string().trim().max(24).default(""),
  subtitle: z.string().trim().max(40).default(""),
  shirt: z.enum(Object.keys(SHIRT_COLORS) as [ShirtColor, ...ShirtColor[]]).default("black"),
  accent: z.enum(Object.keys(ACCENTS) as [Accent, ...Accent[]]).default("gold"),
  style: z.enum(Object.keys(STYLES) as [Style, ...Style[]]).default("classic"),
  size: z.enum(SIZES).default("m"),
  /** show the date line */
  showDate: z.boolean().default(true),
});
export type Design = z.infer<typeof designSchema>;

export const DEFAULT_DESIGN: Design = {
  v: 1,
  date: "1994-06-14",
  name: "Amelia",
  subtitle: "Lisbon, Portugal",
  shirt: "black",
  accent: "gold",
  style: "classic",
  size: "m",
  showDate: true,
};

/* ---------- compact URL-safe token ---------- */

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(t: string): string {
  const b64 = t.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((t.length + 3) % 4);
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDesign(d: Design): string {
  const compact = {
    v: 1,
    d: d.date,
    n: d.name,
    s: d.subtitle,
    c: d.shirt,
    a: d.accent,
    t: d.style,
    z: d.size,
    sd: d.showDate ? 1 : 0,
  };
  return b64urlEncode(JSON.stringify(compact));
}

export function decodeDesign(token: string): Design {
  const raw = JSON.parse(b64urlDecode(token));
  return designSchema.parse({
    v: 1,
    date: raw.d,
    name: raw.n ?? "",
    subtitle: raw.s ?? "",
    shirt: raw.c,
    accent: raw.a,
    style: raw.t,
    size: raw.z,
    showDate: raw.sd === undefined ? true : raw.sd === 1,
  });
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function designSummary(d: Design): string {
  const bits = [d.name || "Untitled", formatDateLong(d.date)];
  if (d.subtitle) bits.push(d.subtitle);
  return bits.join(" · ");
}

export function money(cents: number, currency = PRODUCT.currency): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
