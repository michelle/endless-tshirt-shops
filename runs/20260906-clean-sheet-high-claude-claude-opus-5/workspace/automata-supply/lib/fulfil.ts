import type Stripe from "stripe";
import { unchunkItems, tierFromDisplayName, SHIPPING_TIERS } from "./stripe";
import { decodeLineItem, designTitle, GARMENT_BY_ID } from "./design";
import { printUrl, siteOrigin } from "./art";
import {
  createOrder,
  findOrderIdByMerchantReference,
  TEE_SKU,
  type ProdigiItem,
  type ProdigiOrderRequest,
} from "./prodigi";

/** Stripe moved shipping details under `collected_information` in 2025 API
 *  versions; accept either shape so a pinned or default version both work. */
function shippingFrom(session: Stripe.Checkout.Session): {
  name: string | null;
  address: Stripe.Address | null;
} {
  const anySession = session as unknown as {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    collected_information?: {
      shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    } | null;
  };
  const details =
    anySession.collected_information?.shipping_details ?? anySession.shipping_details ?? null;
  return {
    name: details?.name ?? session.customer_details?.name ?? null,
    address: details?.address ?? null,
  };
}

export type FulfilResult =
  | { status: "created"; orderId: string }
  | { status: "already"; orderId: string }
  /** Deliberately not submitted yet — the webhook still has time to do it. */
  | { status: "waiting" }
  | { status: "failed"; error: string; retryable: boolean };

export type FulfilOptions = {
  /**
   * Refuse to create a new order until the session is at least this old.
   * The order page uses this so that landing on it milliseconds after payment
   * cannot race the webhook into submitting the same order twice.
   */
  minAgeSecondsBeforeCreate?: number;
};

/**
 * Turn a paid Checkout Session into a Prodigi print order.
 *
 * Safe to call more than once for the same session: the Prodigi order id is
 * written back to the PaymentIntent, and that is checked before we print.
 */
export async function fulfilSession(
  stripeClient: Stripe,
  session: Stripe.Checkout.Session,
  options: FulfilOptions = {},
): Promise<FulfilResult> {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // 1. Fast path: we already recorded the print order against the payment.
  if (paymentIntentId) {
    const pi = await stripeClient.paymentIntents.retrieve(paymentIntentId);
    const existing = pi.metadata?.prodigi_order_id;
    if (existing) return { status: "already", orderId: existing };
  }

  // 2. Authoritative check: ask Prodigi whether this session was already
  // submitted. Covers the case where an order was created but writing the id
  // back to Stripe failed, and it is the guard that survives concurrent calls.
  const alreadySubmitted = await findOrderIdByMerchantReference(session.id);
  if (alreadySubmitted) {
    await rememberOrderId(stripeClient, paymentIntentId, alreadySubmitted);
    return { status: "already", orderId: alreadySubmitted };
  }

  // 3. Hold off if the webhook is still within its window to do this itself.
  const minAge = options.minAgeSecondsBeforeCreate ?? 0;
  if (minAge > 0) {
    const ageSeconds = Date.now() / 1000 - session.created;
    if (ageSeconds < minAge) return { status: "waiting" };
  }

  const encoded = unchunkItems(session.metadata);
  if (encoded.length === 0) {
    return { status: "failed", error: "Session metadata had no items", retryable: false };
  }

  const items: ProdigiItem[] = [];
  for (const [index, raw] of encoded.entries()) {
    const parsed = decodeLineItem(raw);
    if (!parsed) {
      return { status: "failed", error: `Unreadable item: ${raw}`, retryable: false };
    }
    const garment = GARMENT_BY_ID[parsed.garmentId];
    items.push({
      merchantReference: `${session.id}-${index}`,
      sku: TEE_SKU,
      copies: parsed.qty,
      // The asset is authored at the exact print-area aspect ratio, so filling
      // it reproduces the placement shown in the preview.
      sizing: "fillPrintArea",
      attributes: { color: garment.prodigi, size: parsed.size },
      assets: [{ printArea: "front", url: printUrl(parsed.design, siteOrigin()) }],
    });
  }

  const { name, address } = shippingFrom(session);
  if (!address?.line1 || !address.country || !address.city || !address.postal_code) {
    return { status: "failed", error: "Session had no usable shipping address", retryable: false };
  }

  const tier = tierFromDisplayName(
    session.shipping_cost?.shipping_rate && typeof session.shipping_cost.shipping_rate !== "string"
      ? session.shipping_cost.shipping_rate.display_name
      : null,
  );

  const order: ProdigiOrderRequest = {
    merchantReference: session.id,
    shippingMethod: SHIPPING_TIERS[tier].prodigi,
    recipient: {
      name: name ?? "Automata Supply customer",
      email: session.customer_details?.email ?? undefined,
      address: {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
        townOrCity: address.city,
        stateOrCounty: address.state ?? undefined,
      },
    },
    items,
    metadata: {
      stripeSessionId: session.id,
      designs: encoded.map((e) => {
        const p = decodeLineItem(e);
        return p ? designTitle(p.design) : e;
      }),
    },
  };

  let result;
  try {
    result = await createOrder(order, session.id);
  } catch (e) {
    // Network-level failure: worth another delivery attempt.
    return {
      status: "failed",
      error: e instanceof Error ? e.message : "Prodigi request threw",
      retryable: true,
    };
  }

  if (!result.ok) {
    return { status: "failed", error: result.error, retryable: false };
  }

  await rememberOrderId(stripeClient, paymentIntentId, result.id);
  return { status: "created", orderId: result.id };
}

async function rememberOrderId(
  stripeClient: Stripe,
  paymentIntentId: string | null,
  orderId: string,
): Promise<void> {
  if (!paymentIntentId) return;
  try {
    await stripeClient.paymentIntents.update(paymentIntentId, {
      metadata: { prodigi_order_id: orderId, prodigi_status: "submitted" },
    });
  } catch {
    // The Prodigi lookup above will find the order again next time, so a
    // failed bookkeeping write cannot cause a duplicate print.
  }
}

/** Record a fulfilment failure on the PaymentIntent so it is visible in Stripe. */
export async function recordFailure(
  stripeClient: Stripe,
  session: Stripe.Checkout.Session,
  error: string,
): Promise<void> {
  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  if (!pi) return;
  try {
    await stripeClient.paymentIntents.update(pi, {
      metadata: { prodigi_status: "failed", prodigi_error: error.slice(0, 490) },
    });
  } catch {
    // Never let bookkeeping mask the original failure.
  }
}
