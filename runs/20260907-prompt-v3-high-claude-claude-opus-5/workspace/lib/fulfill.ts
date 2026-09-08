/** Post-payment fulfilment: turn a paid Stripe Checkout Session into a
 *  Prodigi print order.
 *
 *  Safe to call more than once for the same session:
 *   - it refuses to do anything unless Stripe says payment_status === "paid";
 *   - Prodigi dedupes on idempotencyKey (the Stripe session id), so a retried
 *     webhook returns the original order instead of printing a second shirt.
 */

import type Stripe from "stripe";
import { stripe, siteUrl } from "./stripe";
import { decodeSpec } from "./spec";
import { colorById, sizeById, PRODIGI_SKU, PRODIGI_SHIPPING_METHOD, Ink } from "./catalog";
import { printFileUrl } from "./order";
import { createProdigiOrder, getProdigiOrder, ProdigiOrder } from "./prodigi";

export type FulfillResult =
  | { status: "created" | "existing"; orderId: string; order?: ProdigiOrder }
  | { status: "unpaid" }
  | { status: "error"; message: string };

type Recipient = {
  name: string;
  email?: string;
  phoneNumber?: string | null;
  address: {
    line1: string;
    line2?: string | null;
    townOrCity: string;
    stateOrCounty?: string | null;
    postalOrZipCode: string;
    countryCode: string;
  };
};

/** Stripe moved shipping details under collected_information; support both. */
function resolveRecipient(session: Stripe.Checkout.Session): Recipient | null {
  const collected = (
    session as unknown as {
      collected_information?: {
        shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
      };
      shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    }
  );
  const shipping = collected.collected_information?.shipping_details ?? collected.shipping_details;
  const address = shipping?.address ?? session.customer_details?.address ?? null;
  const name = shipping?.name ?? session.customer_details?.name ?? null;

  if (!address?.line1 || !address.country || !address.city || !address.postal_code || !name) {
    return null;
  }
  return {
    name,
    email: session.customer_details?.email ?? undefined,
    phoneNumber: session.customer_details?.phone ?? null,
    address: {
      line1: address.line1,
      line2: address.line2 ?? null,
      townOrCity: address.city,
      stateOrCounty: address.state ?? null,
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
    },
  };
}

/** Records the Prodigi order id on the PaymentIntent so the order page and
 *  any human looking at the Stripe dashboard can follow the thread. */
async function linkOrderToPayment(
  session: Stripe.Checkout.Session,
  prodigiOrderId: string
): Promise<void> {
  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!pi) return;
  try {
    await stripe().paymentIntents.update(pi, {
      metadata: { prodigi_order_id: prodigiOrderId },
    });
  } catch (err) {
    // Non-fatal: the shirt is already ordered, this is only bookkeeping.
    console.error("[fulfill] could not annotate payment intent", err);
  }
}

export async function fulfillSession(sessionId: string): Promise<FulfillResult> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (session.payment_status !== "paid") {
    return { status: "unpaid" };
  }

  // If we already recorded a Prodigi order, just report it back.
  const existingId =
    typeof session.payment_intent === "object" && session.payment_intent
      ? session.payment_intent.metadata?.prodigi_order_id
      : undefined;
  if (existingId) {
    try {
      const found = await getProdigiOrder(existingId);
      if (found.order) return { status: "existing", orderId: existingId, order: found.order };
    } catch (err) {
      console.error("[fulfill] could not re-read Prodigi order", err);
    }
    return { status: "existing", orderId: existingId };
  }

  const meta = session.metadata ?? {};
  const spec = decodeSpec(meta.design_token ?? "");
  const color = colorById(meta.garment_color ?? "");
  const size = sizeById(meta.garment_size ?? "");

  if (!spec || !color || !size) {
    const message = `Session ${sessionId} is missing design metadata`;
    console.error("[fulfill]", message, meta);
    return { status: "error", message };
  }

  const recipient = resolveRecipient(session);
  if (!recipient) {
    const message = `Session ${sessionId} has no usable shipping address`;
    console.error("[fulfill]", message);
    return { status: "error", message };
  }

  const ink: Ink = meta.ink === "coal" ? "coal" : color.ink;
  const assetUrl = printFileUrl(siteUrl(), ink, meta.design_token!);

  const result = await createProdigiOrder({
    merchantReference: sessionId,
    idempotencyKey: sessionId,
    shippingMethod: PRODIGI_SHIPPING_METHOD,
    recipient,
    items: [
      {
        merchantReference: `${sessionId}-front`,
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: { color: color.id, size: size.id },
        assets: [{ printArea: "front", url: assetUrl }],
      },
    ],
    metadata: {
      commonName: meta.common_name,
      binomial: meta.binomial,
      keeper: meta.keeper,
      stripeSessionId: sessionId,
    },
  });

  const order = result.order;
  if (!order?.id) {
    const message = `Prodigi returned ${result.outcome} without an order`;
    console.error("[fulfill]", message, result);
    return { status: "error", message };
  }

  await linkOrderToPayment(session, order.id);
  console.log(
    `[fulfill] ${result.outcome} Prodigi order ${order.id} for session ${sessionId}`
  );
  return {
    status: result.outcome === "AlreadyExists" ? "existing" : "created",
    orderId: order.id,
    order,
  };
}
