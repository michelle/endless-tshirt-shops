import { z } from "zod";

export const PALETTES = {
  tide: { name: "Electric tide", start: "#16d9ff", end: "#a8ff3e" },
  solar: { name: "Solar flare", start: "#ff653f", end: "#ffd43b" },
  aura: { name: "Night aura", start: "#8e6fff", end: "#ff54b8" },
} as const;

export const GARMENTS = {
  black: { name: "Ink black", swatch: "#090b10", text: "#ffffff" },
  white: { name: "Studio white", swatch: "#f5f4ef", text: "#090b10" },
  "navy blue": { name: "Deep navy", swatch: "#101a34", text: "#ffffff" },
} as const;

export const SIZES = ["XS", "S", "M", "L", "XL", "2XL"] as const;

export const customizationSchema = z.object({
  phrase: z.string().trim().min(3).max(34),
  detail: z.string().trim().min(2).max(42),
  palette: z.enum(["tide", "solar", "aura"]),
  garment: z.enum(["black", "white", "navy blue"]),
  size: z.enum(SIZES),
  quantity: z.number().int().min(1).max(5).default(1),
});

export type Customization = z.infer<typeof customizationSchema>;

export const PRODUCT = {
  name: "One-of-One Signal Shirt",
  sku: "GLOBAL-TEE-BC-3001",
  unitAmount: 4200,
  shippingAmount: 500,
  currency: "usd",
} as const;
