import { z } from "zod";

export const SHIRT_STYLES = ["fitted", "unisex"] as const;
export const SHIRT_SIZES = ["S", "M", "L", "XL"] as const;

export type ShirtStyle = (typeof SHIRT_STYLES)[number];
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export const shirtConfig: Record<
  ShirtStyle,
  { label: string; description: string; prodigiSku: string }
> = {
  fitted: {
    label: "Fitted",
    description: "Slim cut · Bella + Canvas 6004",
    prodigiSku: "GLOBAL-TEE-BC-6004",
  },
  unisex: {
    label: "Unisex",
    description: "Classic cut · Bella + Canvas 3001",
    prodigiSku: "GLOBAL-TEE-BC-3001",
  },
};

export const checkoutInputSchema = z.object({
  style: z.enum(SHIRT_STYLES),
  size: z.enum(SHIRT_SIZES),
  timestamp: z.string().regex(/^\d{13}$/, "Timestamp must be 13 digits"),
});

export function getPriceCents(): number {
  const configured = Number(process.env.PRODUCT_PRICE_CENTS ?? "2250");
  return Number.isInteger(configured) && configured >= 50 ? configured : 2250;
}

export function getCurrency(): string {
  return (process.env.STORE_CURRENCY ?? "usd").toLowerCase();
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(Number(timestamp));
  return Number.isNaN(date.getTime())
    ? timestamp
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "long",
        timeZone: "UTC",
      }).format(date);
}
