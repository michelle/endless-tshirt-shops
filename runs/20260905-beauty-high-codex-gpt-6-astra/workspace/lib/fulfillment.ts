import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { stripe, verifyEnvironment } from "./stripe";
import { purchaseSchema, PRICE, SKUS } from "./catalog";
import { artworkUrl } from "./artwork";
import { prodigi, type ProdigiOrder } from "./prodigi";
export function fulfillmentKey(sessionId: string) {
  return createHash("sha256").update(`datetime-v1:${sessionId}`).digest("hex");
}
export function orderPayload(session: Stripe.Checkout.Session) {
  const p = purchaseSchema.parse({
    timestamp: Number(session.metadata?.timestamp),
    color: session.metadata?.color,
    size: session.metadata?.size,
    fit: session.metadata?.fit,
    requestId: session.metadata?.requestId,
  });
  const shipping = session.collected_information?.shipping_details;
  if (
    !shipping?.address ||
    !shipping.name ||
    shipping.address.country !== "US" ||
    !shipping.address.line1 ||
    !shipping.address.city ||
    !shipping.address.postal_code ||
    !shipping.address.state
  )
    throw new Error("A complete US shipping address is required");
  const a = shipping.address;
  return {
    merchantReference: session.id,
    idempotencyKey: fulfillmentKey(session.id),
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name,
      address: {
        line1: a.line1,
        line2: a.line2 || undefined,
        postalOrZipCode: a.postal_code,
        countryCode: "US",
        townOrCity: a.city,
        stateOrCounty: a.state,
      },
    },
    // Customer email is intentionally not passed to Prodigi; receipts remain managed by Stripe.
    items: [
      {
        merchantReference: `${p.timestamp}`,
        sku: SKUS[p.fit],
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: p.color, size: p.size.toLowerCase() },
        assets: [
          { printArea: "front", url: artworkUrl(String(p.timestamp), p.color) },
        ],
      },
    ],
    metadata: {
      source: "datetime.store",
      stripeSessionId: session.id,
      artworkVersion: "1",
    },
  };
}
export function assertPaidOrder(session: Stripe.Checkout.Session) {
  if (session.metadata?.store !== "datetime-v1")
    throw new Error("Unknown store order");
  if (session.payment_status !== "paid" || session.status !== "complete")
    throw new Error("Payment has not completed");
  if (session.amount_total !== PRICE || session.currency !== "usd")
    throw new Error("Unexpected order total");
  verifyEnvironment(session.livemode);
}
export async function fulfillCheckout(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  assertPaidOrder(session);
  if (session.metadata?.prodigiOrderId) return session.metadata.prodigiOrderId;
  try {
    const result = await prodigi<{ order: ProdigiOrder }>("/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload(session)),
    });
    if (!result.order?.id)
      throw new Error("Print service did not return an order");
    await stripe().checkout.sessions.update(sessionId, {
      metadata: {
        prodigiOrderId: result.order.id,
        fulfillmentStatus: "submitted",
        fulfillmentError: "",
      },
    });
    return result.order.id;
  } catch (error) {
    // Stripe retries failed webhooks. Prodigi's permanent idempotency key protects
    // against a second print if submission succeeded but the response was lost.
    await stripe()
      .checkout.sessions.update(sessionId, {
        metadata: {
          fulfillmentStatus: "needs_retry",
          fulfillmentError: "Print submission needs a retry. See server logs.",
        },
      })
      .catch(() => {});
    throw error;
  }
}
