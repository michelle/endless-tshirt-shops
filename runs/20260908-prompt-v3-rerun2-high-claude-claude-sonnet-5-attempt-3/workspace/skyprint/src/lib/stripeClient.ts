import { loadStripe, type Stripe } from "@stripe/stripe-js";

let promise: Promise<Stripe | null> | null = null;

export function getStripeClient() {
  if (!promise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    promise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return promise;
}

// The customer only ever enters a wall-clock date/time for their moment
// (we don't know their timezone at that place in the past). We pin it to
// UTC uniformly so the deterministic design -- star seed AND moon phase --
// is byte-for-byte identical between the browser preview and the server
// generated print file, rather than depending on the parsing machine's
// local timezone.
export function toDesignDateISO(datetimeLocalValue: string): string {
  if (!datetimeLocalValue) return "";
  return datetimeLocalValue.length === 16 ? `${datetimeLocalValue}:00Z` : datetimeLocalValue;
}
