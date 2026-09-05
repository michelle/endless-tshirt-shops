import type Stripe from "stripe";
import { PRICE_CENTS, itemFor } from "./catalog";
import { appUrl, assertModes, required, sandbox } from "./config";
import { accessToken, safeEqual, verifyDesign, HttpError } from "./security";
import { stripe } from "./stripe";
import { prodigi, resolveOrderResponse, type ProdigiOrder } from "./prodigi";
export function validateSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.store_id !== required("STORE_ID"))
    throw new HttpError(404, "Order not found.");
  const design = verifyDesign(session.metadata.design_token ?? "");
  if (session.client_reference_id !== design.requestId)
    throw new Error("Order reference mismatch");
  assertModes(session.livemode);
  if (
    session.amount_total !== PRICE_CENTS ||
    session.currency !== "usd" ||
    session.mode !== "payment"
  )
    throw new Error("Unexpected order amount or currency");
  return design;
}
export function authorizeSession(
  session: Stripe.Checkout.Session,
  token: string,
) {
  const design = validateSession(session);
  if (!safeEqual(accessToken(design.requestId), token))
    throw new HttpError(404, "Order not found.");
  return design;
}
export function fulfillmentBody(session: Stripe.Checkout.Session) {
  const design = validateSession(session);
  if (session.payment_status !== "paid" || session.status !== "complete")
    throw new Error("Order has not been paid");
  const intent =
    typeof session.payment_intent === "object" ? session.payment_intent : null;
  const shipping =
    session.collected_information?.shipping_details ?? intent?.shipping;
  const address = shipping?.address;
  if (
    !shipping?.name ||
    !address?.line1 ||
    !address.city ||
    !address.state ||
    !address.postal_code ||
    address.country !== "US"
  )
    throw new Error("A complete US shipping address is required");
  return {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name,
      email: session.customer_details?.email ?? undefined,
      address: {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        townOrCity: address.city,
        stateOrCounty: address.state,
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
      },
    },
    items: [
      {
        ...itemFor(
          design,
          `${appUrl()}/api/artwork/${session.metadata!.design_token}`,
        ),
        merchantReference: design.requestId,
      },
    ],
    metadata: {
      store: required("STORE_ID"),
      stripeSessionId: session.id,
      timestamp: String(design.timestamp),
      artworkVersion: "1",
    },
  };
}
export async function fulfill(sessionId: string): Promise<ProdigiOrder | null> {
  const s = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge"],
  });
  validateSession(s);
  if (s.payment_status !== "paid" || s.status !== "complete") return null;
  if (s.metadata?.prodigi_order_id) {
    return (
      await prodigi<{ order: ProdigiOrder }>(
        `/orders/${encodeURIComponent(s.metadata.prodigi_order_id)}`,
      )
    ).order;
  }
  const intent = typeof s.payment_intent === "object" ? s.payment_intent : null;
  const charge =
    typeof intent?.latest_charge === "object" ? intent.latest_charge : null;
  if (charge?.refunded) {
    await stripe().checkout.sessions.update(s.id, {
      metadata: { fulfillment_state: "refunded", fulfillment_error: "" },
    });
    return null;
  }
  try {
    const result = await prodigi<{ outcome: string; order: ProdigiOrder }>(
      "/orders",
      fulfillmentBody(s),
    );
    if (!result.order?.id)
      throw new Error(`Prodigi did not accept order: ${result.outcome}`);
    const order = await resolveOrderResponse(result);
    await stripe().checkout.sessions.update(s.id, {
      metadata: {
        prodigi_order_id: order.id,
        fulfillment_state: order.status.issues?.length
          ? "needs_attention"
          : "submitted",
        fulfillment_error: "",
      },
    });
    console.info(
      JSON.stringify({
        event: "fulfillment_submitted",
        sessionId: s.id,
        orderId: result.order.id,
        sandbox: sandbox(),
        outcome: result.outcome,
      }),
    );
    return order;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "fulfillment_failed",
        sessionId: s.id,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    await stripe()
      .checkout.sessions.update(s.id, {
        metadata: {
          fulfillment_state: "retry_pending",
          fulfillment_error: "Print partner submission needs retry",
        },
      })
      .catch(() => {});
    throw error;
  }
}
export function summarize(
  session: Stripe.Checkout.Session,
  order: ProdigiOrder | null,
) {
  const design = validateSession(session);
  const paid = session.payment_status === "paid";
  const issues = Boolean(order?.status.issues?.length);
  const stage = order?.status.stage;
  const status =
    session.metadata?.fulfillment_state === "refunded"
      ? "refunded"
      : !paid
        ? session.status === "expired"
          ? "expired"
          : "unpaid"
        : issues
          ? "needs_attention"
          : stage === "Cancelled"
            ? "cancelled"
            : stage === "Complete"
              ? "complete"
              : order
                ? "submitted"
                : "processing";
  return {
    status,
    paid,
    testMode: !session.livemode,
    fit: design.fit,
    size: design.size,
    timestamp: design.timestamp,
    amount: PRICE_CENTS,
    currency: "USD",
    reference: order?.id ?? session.id.slice(-12),
    prodigiOrderId: order?.id ?? null,
    printStage: stage ?? null,
    tracking: (order?.shipments ?? []).map((s) => ({
      number: s.tracking?.number ?? null,
      url: s.tracking?.url?.startsWith("https://") ? s.tracking.url : null,
      carrier: s.carrier?.name ?? null,
    })),
    checkoutUrl: !paid && session.status === "open" ? session.url : null,
  };
}
