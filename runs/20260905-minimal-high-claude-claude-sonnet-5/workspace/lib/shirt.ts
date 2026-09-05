// Shared product definitions for the datetime.store tee.
//
// There is exactly one product: a t-shirt printed with the precise moment
// (to the millisecond) that the customer completed checkout. It ships in two
// cuts, each mapped to a real Prodigi Print API SKU.

export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const STYLES: Record<
  ShirtStyle,
  { label: string; sku: string; description: string }
> = {
  fitted: {
    label: "Fitted",
    sku: "GLOBAL-TEE-GIL-64000L",
    description: "Women's fit, Gildan 64000L Softstyle",
  },
  unisex: {
    label: "Unisex",
    sku: "GLOBAL-TEE-GIL-64000",
    description: "Unisex fit, Gildan 64000 Softstyle",
  },
};

export const SIZES: Record<ShirtSize, string> = {
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
};

// Both SKUs are printed in black so the white timestamp print pops, mirroring
// the original datetime.store shirts.
export const SHIRT_COLOR = "black";

export const PRICE_CENTS = 2250;
export const PRICE_WAS_CENTS = 3000;
export const CURRENCY = "usd";

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

/** Formats an epoch-ms timestamp the way it should appear on the shirt. */
export function formatTimestampForPrint(ts: number): {
  epoch: string;
  human: string;
  ms: string;
} {
  const date = new Date(ts);
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  const human = date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
  return { epoch: String(ts), human, ms };
}
