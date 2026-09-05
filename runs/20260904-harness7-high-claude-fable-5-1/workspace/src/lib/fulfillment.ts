import type Stripe from "stripe";
import { STYLES, SHIRT_COLOR, prodigiSize, type SizeId, type StyleId, SIZE_IDS, STYLE_IDS } from "./catalog";
import { artworkUrl } from "./artwork";
import { prodigi, ProdigiError, type ProdigiCreateOrder } from "./prodigi";
import { stripe } from "./stripe";
import { shipCountries, siteUrl } from "./env";

/**
 * Fulfilment: turn a paid Stripe PaymentIntent into a Prodigi print order.
 *
 * Stripe is our system of record (no database): the shirt spec lives in the
 * PaymentIntent metadata at creation time, and the Prodigi order id/status are
 * written back into the same metadata. The function is idempotent — it can be
 * called from the Stripe webhook *and* from the browser after payment, in any
 * order, any number of times — protected by both a metadata check and
 * Prodigi's own idempotencyKey.
 */

export type FulfillmentResult =
  | { status: "fulfilled" | "already_fulfilled"; prodigiOrderId: string; prodigiStage?: string }
  | { status: "not_paid"; paymentStatus: string }
  | { status: "failed"; error: string };

export interface ShirtSpec {
  style: StyleId;
  size: SizeId;
  timestamp: number;
}

export function shirtSpecFromMetadata(metadata: Stripe.Metadata): ShirtSpec | null {
  const style = metadata.style as StyleId;
  const size = metadata.size as SizeId;
  const timestamp = Number(metadata.timestamp);
  if (!STYLE_IDS.includes(style) || !SIZE_IDS.includes(size) || !Number.isInteger(timestamp)) {
    return null;
  }
  return { style, size, timestamp };
}

export function buildProdigiOrder(pi: Stripe.PaymentIntent, spec: ShirtSpec): ProdigiCreateOrder {
  const shipping = pi.shipping;
  if (!shipping?.address || !shipping.name) {
    throw new Error(`PaymentIntent ${pi.id} has no shipping address`);
  }
  const addr = shipping.address;
  if (!addr.line1 || !addr.city || !addr.postal_code || !addr.country) {
    throw new Error(`PaymentIntent ${pi.id} shipping address is incomplete`);
  }
  if (!shipCountries().includes(addr.country.toUpperCase())) {
    throw new Error(
      `PaymentIntent ${pi.id} ships to ${addr.country}, which is outside SHIP_COUNTRIES; refund or fulfil manually`,
    );
  }
  const style = STYLES[spec.style];
  const origin = siteUrl();
  return {
    merchantReference: pi.id,
    idempotencyKey: pi.id,
    shippingMethod: "Standard",
    callbackUrl: `${origin}/api/webhooks/prodigi`,
    recipient: {
      name: shipping.name,
      email: pi.receipt_email ?? undefined,
      phoneNumber: shipping.phone ?? undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        townOrCity: addr.city,
        stateOrCounty: addr.state ?? undefined,
        postalOrZipCode: addr.postal_code,
        countryCode: addr.country,
      },
    },
    items: [
      {
        sku: style.sku,
        copies: 1,
        sizing: "fillPrintArea",
        merchantReference: `${spec.style}-${spec.size}-${spec.timestamp}`,
        attributes: { color: SHIRT_COLOR, size: prodigiSize(spec.size) },
        assets: [{ printArea: style.printArea, url: artworkUrl(origin, spec.style, spec.timestamp) }],
      },
    ],
    metadata: {
      paymentIntent: pi.id,
      timestamp: spec.timestamp,
      style: spec.style,
      size: spec.size,
      source: "datetime.store",
    },
  };
}

export async function fulfillPaymentIntent(paymentIntentId: string): Promise<FulfillmentResult> {
  const s = stripe();
  const pi = await s.paymentIntents.retrieve(paymentIntentId);
  return fulfillPaymentIntentObject(pi);
}

export async function fulfillPaymentIntentObject(pi: Stripe.PaymentIntent): Promise<FulfillmentResult> {
  const s = stripe();
  if (pi.status !== "succeeded") {
    return { status: "not_paid", paymentStatus: pi.status };
  }
  if (pi.metadata.prodigi_order_id) {
    return {
      status: "already_fulfilled",
      prodigiOrderId: pi.metadata.prodigi_order_id,
      prodigiStage: pi.metadata.prodigi_stage,
    };
  }
  const spec = shirtSpecFromMetadata(pi.metadata);
  if (!spec) {
    return { status: "failed", error: "PaymentIntent metadata does not describe a shirt" };
  }
  try {
    const order = buildProdigiOrder(pi, spec);
    const res = await prodigi.createOrder(order);
    await s.paymentIntents.update(pi.id, {
      metadata: {
        prodigi_order_id: res.order.id,
        prodigi_stage: res.order.status.stage,
        prodigi_outcome: res.outcome,
        prodigi_env: process.env.PRODIGI_ENV === "live" ? "live" : "sandbox",
        fulfilled_at: new Date().toISOString(),
        fulfillment_error: "",
      },
    });
    console.log(`[fulfil] ${pi.id} -> Prodigi ${res.order.id} (${res.outcome})`);
    return { status: "fulfilled", prodigiOrderId: res.order.id, prodigiStage: res.order.status.stage };
  } catch (err) {
    const message =
      err instanceof ProdigiError ? `${err.message}: ${JSON.stringify(err.body).slice(0, 400)}` : String(err);
    console.error(`[fulfil] ${pi.id} failed:`, message);
    try {
      await s.paymentIntents.update(pi.id, {
        metadata: { fulfillment_error: message.slice(0, 480), fulfillment_failed_at: new Date().toISOString() },
      });
    } catch (metaErr) {
      console.error(`[fulfil] could not record failure on ${pi.id}:`, metaErr);
    }
    return { status: "failed", error: message };
  }
}

/** Refresh the Prodigi status cached on the PaymentIntent (used by the Prodigi callback and admin page). */
export async function syncProdigiStatus(paymentIntentId: string): Promise<string | null> {
  const s = stripe();
  const pi = await s.paymentIntents.retrieve(paymentIntentId);
  const orderId = pi.metadata.prodigi_order_id;
  if (!orderId) return null;
  const res = await prodigi.getOrder(orderId);
  const tracking = res.order.shipments?.find((sh) => sh.tracking?.url)?.tracking;
  await s.paymentIntents.update(pi.id, {
    metadata: {
      prodigi_stage: res.order.status.stage,
      ...(tracking?.url ? { tracking_url: tracking.url, tracking_number: tracking.number ?? "" } : {}),
    },
  });
  return res.order.status.stage;
}
