import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, { appInfo: { name: "Orrery Tees", version: "0.1.0" } });
  }
  return client;
}

// Countries we accept at checkout. All are in Prodigi's shipsTo list for the tee.
export const ALLOWED_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI",
  "PT", "PL", "CZ", "HU", "GR", "RO", "LU", "JP", "SG", "KR", "HK", "MX", "BR", "AE", "IL", "ZA", "IN", "MY", "TH",
];
