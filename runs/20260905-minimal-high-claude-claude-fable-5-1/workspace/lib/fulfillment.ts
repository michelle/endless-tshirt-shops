import type Stripe from "stripe";
import { stripe } from "./stripe";
import { createOrder, getOrder, ProdigiError, type ProdigiOrder } from "./prodigi";
import { artworkUrl, isValidTimestamp } from "./artwork";
import { isShirtSize, isShirtStyle, prodigiSize, PRODIGI_SKUS, SHIRT_COLOR } from "./products";

/**
 * Metadata keys we store on the Stripe PaymentIntent. The PaymentIntent is our
 * system of record (no database): what was bought lives in metadata at
 * creation time, and fulfilment results are written back after Prodigi accepts
 * the order.
 */
export const META = {
  style: "shirt_style",
  size: "shirt_size",
  timestamp: "shirt_timestamp",
  artworkUrl: "artwork_url",
  prodigiOrderId: "prodigi_order_id",
  prodigiOutcome: "prodigi_outcome",
  prodigiError: "prodigi_error",
  fulfilledAt: "fulfilled_at",
  shipName: "ship_name",
  shipPhone: "ship_phone",
  shipLine1: "ship_line1",
  shipLine2: "ship_line2",
  shipCity: "ship_city",
  shipState: "ship_state",
  shipPostal: "ship_postal_code",
  shipCountry: "ship_country",
} as const;

export interface ShippingDetails {
  name: string;
  phone?: string;
  address: { line1: string; line2?: string; city: string; state?: string; postal_code: string; country: string };
}

/** Flatten validated shipping details into PaymentIntent metadata (500 chars max per value). */
export function shippingMetadata(s: ShippingDetails): Record<string, string> {
  return {
    [META.shipName]: s.name,
    [META.shipPhone]: s.phone || "",
    [META.shipLine1]: s.address.line1,
    [META.shipLine2]: s.address.line2 || "",
    [META.shipCity]: s.address.city,
    [META.shipState]: s.address.state || "",
    [META.shipPostal]: s.address.postal_code,
    [META.shipCountry]: s.address.country,
  };
}

/** Shipping details for fulfilment: the server-validated metadata copy first, then Stripe's `shipping` field. */
export function shippingFromPaymentIntent(pi: Stripe.PaymentIntent): ShippingDetails | null {
  const m = pi.metadata || {};
  if (m[META.shipLine1] && m[META.shipCity] && m[META.shipPostal] && m[META.shipCountry] && m[META.shipName]) {
    return {
      name: m[META.shipName],
      phone: m[META.shipPhone] || undefined,
      address: {
        line1: m[META.shipLine1],
        line2: m[META.shipLine2] || undefined,
        city: m[META.shipCity],
        state: m[META.shipState] || undefined,
        postal_code: m[META.shipPostal],
        country: m[META.shipCountry],
      },
    };
  }
  const s = pi.shipping;
  if (s?.address?.line1 && s.address.city && s.address.postal_code && s.address.country && s.name) {
    return {
      name: s.name,
      phone: s.phone || undefined,
      address: {
        line1: s.address.line1,
        line2: s.address.line2 || undefined,
        city: s.address.city,
        state: s.address.state || undefined,
        postal_code: s.address.postal_code,
        country: s.address.country,
      },
    };
  }
  return null;
}

export interface FulfillmentResult {
  paymentIntentId: string;
  prodigiOrderId: string | null;
  outcome: string;
  stage?: string;
  alreadyFulfilled: boolean;
}

export class FulfillmentError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
    this.name = "FulfillmentError";
  }
}

/**
 * Create the Prodigi order for a paid PaymentIntent. Safe to call more than
 * once (from the Stripe webhook and from the client after confirmation):
 *  - if the PaymentIntent already carries a Prodigi order id we return it;
 *  - the Prodigi request uses the PaymentIntent id as its idempotency key, so
 *    concurrent calls cannot create two orders.
 */
export async function fulfillPaymentIntent(pi: Stripe.PaymentIntent): Promise<FulfillmentResult> {
  const existing = pi.metadata?.[META.prodigiOrderId];
  if (existing) {
    return { paymentIntentId: pi.id, prodigiOrderId: existing, outcome: pi.metadata[META.prodigiOutcome] || "AlreadyExists", alreadyFulfilled: true };
  }
  if (pi.status !== "succeeded") {
    throw new FulfillmentError(`Payment is not complete (status: ${pi.status})`, "payment_not_succeeded", 409);
  }

  const style = pi.metadata?.[META.style];
  const size = pi.metadata?.[META.size];
  const timestamp = Number(pi.metadata?.[META.timestamp]);
  if (!isShirtStyle(style)) throw new FulfillmentError("Invalid shirt style on PaymentIntent", "bad_style", 422);
  if (!isShirtSize(size)) throw new FulfillmentError("Invalid shirt size on PaymentIntent", "bad_size", 422);
  if (!isValidTimestamp(timestamp)) throw new FulfillmentError("Invalid timestamp on PaymentIntent", "bad_timestamp", 422);

  const shipping = shippingFromPaymentIntent(pi);
  if (!shipping) throw new FulfillmentError("PaymentIntent has no shipping address", "missing_shipping", 422);
  const address = shipping.address;

  const email = pi.receipt_email || undefined;

  const response = await createOrder({
    merchantReference: pi.id,
    idempotencyKey: pi.id,
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name,
      email,
      phoneNumber: shipping.phone,
      address: {
        line1: address.line1,
        line2: address.line2,
        townOrCity: address.city,
        stateOrCounty: address.state,
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
      },
    },
    items: [
      {
        merchantReference: `${pi.id}-shirt`,
        sku: PRODIGI_SKUS[style],
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: SHIRT_COLOR, size: prodigiSize(size) },
        assets: [{ printArea: "front", url: pi.metadata[META.artworkUrl] || artworkUrl(timestamp) }],
      },
    ],
    metadata: { stripePaymentIntent: pi.id, timestamp, style, size },
  }).catch(async (err: unknown) => {
    const message = err instanceof ProdigiError ? `${err.message}: ${JSON.stringify(err.body).slice(0, 400)}` : String(err);
    await stripe()
      .paymentIntents.update(pi.id, { metadata: { [META.prodigiError]: message.slice(0, 480) } })
      .catch(() => undefined);
    throw new FulfillmentError(`Could not place the print order: ${message}`, "prodigi_error", 502);
  });

  const order = response.order;
  await stripe().paymentIntents.update(pi.id, {
    metadata: {
      [META.prodigiOrderId]: order.id,
      [META.prodigiOutcome]: response.outcome,
      [META.fulfilledAt]: new Date().toISOString(),
      [META.prodigiError]: "",
    },
  });

  return {
    paymentIntentId: pi.id,
    prodigiOrderId: order.id,
    outcome: response.outcome,
    stage: order.status?.stage,
    alreadyFulfilled: response.outcome === "AlreadyExists",
  };
}

export interface OrderStatus {
  paymentIntentId: string;
  paymentStatus: Stripe.PaymentIntent.Status;
  style: string | null;
  size: string | null;
  timestamp: number | null;
  artworkUrl: string | null;
  prodigiOrderId: string | null;
  prodigi: { stage: string; issues: ProdigiOrder["status"]["issues"]; shipments: ProdigiOrder["shipments"] } | null;
  fulfillmentError: string | null;
}

/** Read-only view of an order, combining the PaymentIntent and the Prodigi order (if any). */
export async function getOrderStatus(paymentIntentId: string): Promise<OrderStatus> {
  const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
  const prodigiOrderId = pi.metadata?.[META.prodigiOrderId] || null;
  let prodigi: OrderStatus["prodigi"] = null;
  if (prodigiOrderId) {
    const res = await getOrder(prodigiOrderId).catch(() => null);
    if (res?.order) {
      prodigi = { stage: res.order.status.stage, issues: res.order.status.issues, shipments: res.order.shipments };
    }
  }
  const ts = Number(pi.metadata?.[META.timestamp]);
  return {
    paymentIntentId: pi.id,
    paymentStatus: pi.status,
    style: pi.metadata?.[META.style] || null,
    size: pi.metadata?.[META.size] || null,
    timestamp: Number.isFinite(ts) && ts > 0 ? ts : null,
    artworkUrl: pi.metadata?.[META.artworkUrl] || null,
    prodigiOrderId,
    prodigi,
    fulfillmentError: pi.metadata?.[META.prodigiError] || null,
  };
}
