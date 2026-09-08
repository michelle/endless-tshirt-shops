import Stripe from "stripe";

export const PRODUCT = {
  sku: "GLOBAL-TEE-BC-3001",
  amount: 3600,
  currency: "usd",
  colors: ["black", "natural", "navy blue"],
  sizes: ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"],
  moods: ["Restless", "Grounded", "Electric", "Tender", "Brave"],
};

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe has not been configured yet.");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function cleanOrder(input) {
  const trim = (value, max) => String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
  const order = { name: trim(input.name, 32), place: trim(input.place, 42), mood: trim(input.mood, 16), size: trim(input.size, 4).toLowerCase(), color: trim(input.color, 28).toLowerCase() };
  if (order.name.length < 1 || order.place.length < 1) throw new Error("Name and place are required.");
  if (!PRODUCT.moods.includes(order.mood) || !PRODUCT.sizes.includes(order.size) || !PRODUCT.colors.includes(order.color)) throw new Error("That product option is not available.");
  return order;
}

export function originFrom(request) {
  return process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin);
}

export function artPayload(order) {
  return Buffer.from(JSON.stringify(order)).toString("base64url");
}

export function readOrder(metadata) {
  return cleanOrder({ name: metadata.signal_name, place: metadata.signal_place, mood: metadata.signal_mood, size: metadata.size, color: metadata.color });
}

export async function submitProdigi(session, request) {
  if (session.payment_status !== "paid") throw new Error("Payment has not cleared.");
  if (!process.env.PRODIGI_API_KEY) throw new Error("Prodigi has not been configured yet.");
  const shipping = session.shipping_details?.address;
  if (!shipping?.line1 || !shipping?.city || !shipping?.postal_code || !shipping?.country) throw new Error("A complete shipping address is required.");
  const order = readOrder(session.metadata || {});
  const origin = originFrom(request);
  const callbackUrl = `${origin}/api/prodigi/callback`;
  const payload = {
    merchantReference: `SF-${session.id}`,
    idempotencyKey: `signal-foundry-${session.id}`,
    shippingMethod: "Standard",
    callbackUrl,
    recipient: {
      name: session.shipping_details?.name || session.customer_details?.name || order.name,
      email: session.customer_details?.email || undefined,
      address: { line1: shipping.line1, line2: shipping.line2 || undefined, townOrCity: shipping.city, stateOrCounty: shipping.state || undefined, postalOrZipCode: shipping.postal_code, countryCode: shipping.country },
    },
    items: [{
      merchantReference: session.id,
      sku: PRODUCT.sku,
      copies: 1,
      sizing: "fitPrintArea",
      recipientCost: { amount: (session.amount_total / 100).toFixed(2), currency: session.currency?.toUpperCase() || "USD" },
      attributes: { color: order.color, size: order.size },
      assets: [{ printArea: "front", url: `${origin}/api/art?d=${artPayload(order)}` }],
    }],
    metadata: { stripeSessionId: session.id, signal: `SF-${artPayload(order).slice(0, 16)}` },
  };
  const base = (process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com").replace(/\/$/, "");
  const response = await fetch(`${base}/v4.0/orders`, { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": process.env.PRODIGI_API_KEY }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.outcome === "Failed") throw new Error(result.statusText || result.message || "Prodigi could not accept this print order.");
  return result.order || result;
}
