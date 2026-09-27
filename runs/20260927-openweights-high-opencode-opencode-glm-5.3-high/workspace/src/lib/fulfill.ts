/**
 * Fulfillment: the bridge between "Stripe says it's paid" and "Prodigi starts
 * a shirt". Runs only from the verified webhook handler.
 *
 * Idempotency is layered so a webhook can be retried as often as Stripe likes:
 *   1. the PaymentIntent is checked for an existing prodigi_order_id stamp;
 *   2. the Prodigi order is created with the Stripe session id as its
 *      idempotency key, so a duplicate request returns the original order;
 *   3. the stamp is written back to the PaymentIntent afterwards.
 */

import type Stripe from "stripe";
import { stripe } from "./stripe";
import {
  createOrder,
  ProdigiError,
  type ProdigiOrderRequest,
  type ProdigiAddress,
} from "./prodigi";
import { artworkUrl } from "./signed";
import { GARMENTS, PRODIGI_SKU, CURRENCY, unitPriceCents } from "./products";
import { specPhaseShort, type OrderSpec } from "./params";

export interface FulfillResult {
  orderId?: string;
  outcome: string;
  duplicate?: boolean;
}

/** Turn a completed checkout session into a Prodigi order. */
export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<FulfillResult> {
  const sessionId = session.id;
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!piId) throw new Error(`session ${sessionId} has no payment_intent`);

  // Layer 1: already fulfilled?
  const pi = await stripe().paymentIntents.retrieve(piId);
  const existing = pi.metadata?.prodigi_order_id;
  if (existing) {
    return { orderId: existing, outcome: "already-fulfilled", duplicate: true };
  }

  const raw = session.metadata?.order_params;
  if (!raw) throw new Error(`session ${sessionId} is missing order params`);
  const spec = JSON.parse(raw) as OrderSpec;
  if (!spec || !spec.date || !spec.size) {
    throw new Error(`session ${sessionId} has invalid order params`);
  }

  const garment = GARMENTS.find((g) => g.id === spec.garment);
  if (!garment) throw new Error(`unknown garment ${spec.garment}`);

  // Where the print can be fetched from: this deployment's artwork endpoint.
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not configured");

  const design = {
    date: spec.date,
    time: spec.time,
    hemisphere: spec.hemisphere,
    garment: spec.garment,
    line: spec.line,
  };

  const shipping = session.collected_information?.shipping_details ?? null;
  const customer = session.customer_details ?? null;
  const address = shipping?.address ?? customer?.address ?? null;
  if (!address || !address.city || !address.country || !address.postal_code) {
    throw new Error(`session ${sessionId} has no usable shipping address`);
  }
  const name = shipping?.name || customer?.name || customer?.email || "Moon wearer";

  const recipientAddress: ProdigiAddress = {
    line1: address.line1 ?? "",
    ...(address.line2 ? { line2: address.line2 } : {}),
    townOrCity: address.city,
    ...(address.state ? { stateOrCounty: address.state } : {}),
    postalOrZipCode: address.postal_code,
    countryCode: address.country,
  };

  const order: ProdigiOrderRequest = {
    shippingMethod: "Standard",
    idempotencyKey: sessionId,
    merchantReference: sessionId,
    recipient: {
      name,
      email: customer?.email ?? undefined,
      phoneNumber: customer?.phone ?? undefined,
      address: recipientAddress,
    },
    items: [
      {
        sku: PRODIGI_SKU,
        copies: spec.quantity ?? 1,
        sizing: "fitPrintArea",
        attributes: { color: garment.prodigiColor, size: spec.size },
        recipientCost: {
          amount: (unitPriceCents(spec.size) * (spec.quantity ?? 1) / 100).toFixed(2),
          currency: CURRENCY.toUpperCase(),
        },
        assets: [{ printArea: "front", url: artworkUrl(design, appUrl) }],
        merchantReference: `moon-tee-${spec.date}-${spec.hemisphere}`,
      },
    ],
    metadata: {
      store: "under-this-moon",
      stripe_session: sessionId,
      stripe_payment_intent: piId,
      phase: specPhaseShort(design),
    },
  };

  // Layer 2: Prodigi-side idempotency.
  const { order: created, outcome } = await createOrder(order);
  if (!created.id) throw new ProdigiError("Prodigi order has no id", 500, outcome, created);

  // Layer 3: stamp the PaymentIntent so future retries short-circuit.
  try {
    await stripe().paymentIntents.update(piId, {
      metadata: {
        ...pi.metadata,
        prodigi_order_id: created.id,
        fulfillment_status: "sent-to-print",
        fulfilled_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    // The order exists; a retry will dedupe via Prodigi's idempotency key.
    console.error("failed to stamp PaymentIntent metadata:", err);
  }

  return { orderId: created.id, outcome };
}
