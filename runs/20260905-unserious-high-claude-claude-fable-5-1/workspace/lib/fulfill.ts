import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import {
  ALLOWED_COUNTRIES,
  PRODIGI_COLOR,
  PRODIGI_PRODUCTS,
  PRODIGI_SIZES,
  isShirtSize,
  isShirtStyle,
} from "./config";
import { artworkUrl, getSiteUrl } from "./site";
import { createOrder, getOrder, ProdigiError, type ProdigiOrder } from "./prodigi";

/**
 * Turn a paid PaymentIntent into a Prodigi order, exactly once.
 *
 * The PaymentIntent's metadata is our order database. Prodigi's
 * idempotencyKey (= the PaymentIntent id) guarantees that if the webhook
 * and the order page race each other, only one shirt gets printed.
 */
export type FulfillmentResult =
  | { state: "unpaid"; pi: Stripe.PaymentIntent }
  | { state: "fulfilled"; pi: Stripe.PaymentIntent; prodigiOrderId: string }
  | { state: "failed"; pi: Stripe.PaymentIntent; error: string };

export async function fulfillPaymentIntent(
  piOrId: string | Stripe.PaymentIntent,
): Promise<FulfillmentResult> {
  const s = stripe();
  let pi = typeof piOrId === "string" ? await s.paymentIntents.retrieve(piOrId) : piOrId;

  if (pi.status !== "succeeded") {
    return { state: "unpaid", pi };
  }
  if (pi.metadata.prodigi_order_id) {
    return { state: "fulfilled", pi, prodigiOrderId: pi.metadata.prodigi_order_id };
  }

  const { style, size, timestamp } = pi.metadata;
  const shipping = pi.shipping;
  if (!isShirtStyle(style) || !isShirtSize(size) || !/^\d+$/.test(timestamp || "")) {
    return await recordFailure(pi, `PaymentIntent ${pi.id} is missing shirt metadata`);
  }
  if (!shipping?.address?.line1 || !shipping.address.postal_code || !shipping.address.country || !shipping.name) {
    return await recordFailure(pi, `PaymentIntent ${pi.id} has an incomplete shipping address`);
  }
  if (!(ALLOWED_COUNTRIES as readonly string[]).includes(shipping.address.country)) {
    return await recordFailure(pi, `We do not ship to ${shipping.address.country} (yet)`);
  }

  const product = PRODIGI_PRODUCTS[style];
  try {
    const { order, outcome } = await createOrder({
      idempotencyKey: pi.id,
      merchantReference: pi.id,
      shippingMethod: "Standard",
      callbackUrl: `${getSiteUrl()}/api/prodigi/callback`,
      recipient: {
        name: shipping.name,
        email: pi.receipt_email || undefined,
        address: {
          line1: shipping.address.line1,
          line2: shipping.address.line2 || undefined,
          townOrCity: shipping.address.city || "",
          stateOrCounty: shipping.address.state || undefined,
          postalOrZipCode: shipping.address.postal_code,
          countryCode: shipping.address.country,
        },
      },
      items: [
        {
          sku: product.sku,
          copies: 1,
          sizing: "fitPrintArea",
          merchantReference: `datetime-${timestamp}`,
          attributes: { color: PRODIGI_COLOR, size: PRODIGI_SIZES[size] },
          assets: [{ printArea: "front", url: artworkUrl(timestamp) }],
        },
      ],
      metadata: {
        timestamp,
        style,
        size,
        stripe_payment_intent: pi.id,
      },
    });

    pi = await s.paymentIntents.update(pi.id, {
      metadata: {
        prodigi_order_id: order.id,
        prodigi_status: order.status?.stage || "",
        prodigi_outcome: outcome,
        prodigi_error: "",
      },
    });
    console.log(`[fulfill] ${pi.id} -> Prodigi ${order.id} (${outcome})`);
    return { state: "fulfilled", pi, prodigiOrderId: order.id };
  } catch (err) {
    const message =
      err instanceof ProdigiError
        ? `${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    console.error(`[fulfill] ${pi.id} failed:`, message);
    return await recordFailure(pi, message);
  }
}

async function recordFailure(pi: Stripe.PaymentIntent, error: string): Promise<FulfillmentResult> {
  try {
    const updated = await stripe().paymentIntents.update(pi.id, {
      metadata: { prodigi_error: error.slice(0, 480) },
    });
    return { state: "failed", pi: updated, error };
  } catch {
    return { state: "failed", pi, error };
  }
}

/** Fetch the live Prodigi order for a PaymentIntent, if there is one. */
export async function loadProdigiOrder(pi: Stripe.PaymentIntent): Promise<ProdigiOrder | null> {
  const id = pi.metadata.prodigi_order_id;
  if (!id) return null;
  try {
    return await getOrder(id);
  } catch (err) {
    console.error(`[fulfill] could not load Prodigi order ${id}:`, err);
    return null;
  }
}

/** Sync a Prodigi status change back onto the PaymentIntent (from callbacks). */
export async function syncProdigiStatus(order: ProdigiOrder): Promise<void> {
  const piId = order.merchantReference;
  if (!piId || !piId.startsWith("pi_")) return;
  await stripe().paymentIntents.update(piId, {
    metadata: {
      prodigi_order_id: order.id,
      prodigi_status: order.status?.stage || "",
    },
  });
}
