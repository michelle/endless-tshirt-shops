import Stripe from "stripe";
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    throw new Error(
      "Payments are not configured yet. Please try again after store setup.",
    );
  return new Stripe(key, { maxNetworkRetries: 2 });
}
export function origin() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL is not configured");
  return value.replace(/\/$/, "");
}
export function mode() {
  return process.env.STORE_MODE === "live" ? "live" : "test";
}
export function assertReady() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (
    !key ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !process.env.PRODIGI_API_KEY ||
    !process.env.ARTWORK_SECRET
  )
    throw new Error(
      "Checkout is not open yet. Payment setup is still in progress. Your design is saved on this device.",
    );
  if (
    mode() === "live" &&
    (!key.startsWith("sk_live_") ||
      process.env.PRODIGI_MODE !== "live" ||
      process.env.LIVE_CHECKOUT_ENABLED !== "true")
  )
    throw new Error("Live checkout requires completed production setup.");
  if (
    mode() === "test" &&
    (!key.startsWith("sk_test_") || process.env.PRODIGI_MODE === "live")
  )
    throw new Error("Payment and fulfillment environments do not match.");
}
