import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  client = new Stripe(key, {
    appInfo: { name: "datetime.store", version: "2.0.0", url: "https://datetime.store" },
  });
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

/**
 * Shipping details moved between API versions
 * (session.shipping_details → session.collected_information.shipping_details).
 * Read both so we don't care which one the account is pinned to.
 */
export function sessionShipping(session: Stripe.Checkout.Session): {
  name: string | null;
  address: Stripe.Address | null;
} | null {
  const s = session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    collected_information?: {
      shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    } | null;
  };
  const details = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  if (!details) return null;
  return { name: details.name ?? null, address: details.address ?? null };
}
