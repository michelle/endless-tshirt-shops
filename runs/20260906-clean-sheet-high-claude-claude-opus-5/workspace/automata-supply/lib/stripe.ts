import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  cached = new Stripe(key, { typescript: true });
  return cached;
}

/**
 * Where we ship. Every entry is a country Prodigi's Gildan 64000 variants list
 * in `shipsTo`, so nobody can buy something we cannot fulfil.
 */
export const SHIPPING_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "IT", "NL", "BE",
  "SE", "NO", "DK", "FI", "PL", "PT", "AT", "CH", "CZ", "JP", "SG", "HK",
] as const;

export type ShippingTier = "standard" | "express";

/**
 * Our two shipping rates and the Prodigi service each maps to. Keeping the
 * mapping here means the webhook can turn a Stripe selection back into a
 * Prodigi `shippingMethod` without guessing.
 */
export const SHIPPING_TIERS: Record<
  ShippingTier,
  {
    label: string;
    amount: number;
    prodigi: "Budget" | "Standard" | "Express";
    minDays: number;
    maxDays: number;
  }
> = {
  standard: {
    label: "Standard",
    amount: 595,
    prodigi: "Budget",
    minDays: 5,
    maxDays: 10,
  },
  express: {
    label: "Express",
    amount: 1695,
    prodigi: "Express",
    minDays: 2,
    maxDays: 5,
  },
};

export function shippingOptions(): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  return (Object.keys(SHIPPING_TIERS) as ShippingTier[]).map((id) => {
    const t = SHIPPING_TIERS[id];
    return {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: t.amount, currency: "usd" },
        display_name: t.label,
        delivery_estimate: {
          minimum: { unit: "business_day", value: t.minDays },
          maximum: { unit: "business_day", value: t.maxDays },
        },
        metadata: { tier: id },
      },
    };
  });
}

/** Recover the tier from a completed session's chosen shipping rate. */
export function tierFromDisplayName(name: string | null | undefined): ShippingTier {
  const match = (Object.keys(SHIPPING_TIERS) as ShippingTier[]).find(
    (id) => SHIPPING_TIERS[id].label.toLowerCase() === (name ?? "").toLowerCase(),
  );
  return match ?? "standard";
}

/**
 * Stripe caps a metadata value at 500 characters, so the encoded cart is split
 * across numbered keys and rejoined by the webhook.
 */
const CHUNK = 450;

export function chunkItems(encoded: string[]): Record<string, string> {
  const joined = encoded.join("|");
  const out: Record<string, string> = { items_count: String(encoded.length) };
  for (let i = 0, part = 0; i < joined.length; i += CHUNK, part++) {
    out[`items_${part}`] = joined.slice(i, i + CHUNK);
  }
  return out;
}

export function unchunkItems(metadata: Stripe.Metadata | null): string[] {
  if (!metadata) return [];
  let joined = "";
  for (let part = 0; ; part++) {
    const piece = metadata[`items_${part}`];
    if (piece === undefined) break;
    joined += piece;
  }
  return joined ? joined.split("|") : [];
}
