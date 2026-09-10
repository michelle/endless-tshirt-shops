import type Stripe from "stripe";
import { stripe, siteUrl } from "./stripe";
import { getChunked, verifyDesignToken } from "./token";
import { createProdigiOrder, getProdigiOrder, ProdigiOrder } from "./prodigi";
import { PRODIGI_SKU, findColor, isSize } from "./catalog";
import { renderRings } from "./rings";

export type FulfillResult =
  | { status: "unpaid" }
  | { status: "fulfilled"; prodigiOrderId: string; created: boolean }
  | { status: "error"; message: string };

/**
 * Idempotently send a paid Checkout Session to Prodigi.
 *
 * Safe to call from the webhook AND the order page: we check PaymentIntent metadata first,
 * and Prodigi's idempotencyKey (the session id) guarantees at most one order even if the
 * two race. Nothing is sent unless Stripe says payment_status === "paid".
 */
export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillResult> {
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (session.payment_status !== "paid") return { status: "unpaid" };

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  if (!pi || typeof pi === "string") return { status: "error", message: "Session has no payment intent." };
  const existing = pi.metadata?.prodigi_order_id;
  if (existing) return { status: "fulfilled", prodigiOrderId: existing, created: false };

  const meta = session.metadata ?? {};
  const token = getChunked(meta, "d");
  const color = findColor(meta.color ?? "");
  const size = meta.size ?? "";
  const quantity = Math.max(1, Math.min(10, Number(meta.quantity) || 1));
  if (!token || !color || !isSize(size)) {
    return { status: "error", message: "Session is missing design metadata." };
  }
  const design = verifyDesignToken(token); // throws if tampered
  const { rings } = renderRings(design, { onDark: color.dark });

  const ship = session.collected_information?.shipping_details ?? null;
  const addr = ship?.address ?? session.customer_details?.address ?? null;
  const name = ship?.name || session.customer_details?.name || "Customer";
  if (!addr || !addr.line1 || !addr.country || !addr.city || !addr.postal_code) {
    return { status: "error", message: "Session has no usable shipping address." };
  }

  const printUrl = `${siteUrl()}/api/print/${encodeURIComponent(token)}.png?c=${encodeURIComponent(color.key)}`;
  const { outcome, order } = await createProdigiOrder({
    merchantReference: `heartwood_${session.id}`,
    shippingMethod: "Standard",
    idempotencyKey: session.id,
    recipient: {
      name,
      email: session.customer_details?.email ?? null,
      phoneNumber: session.customer_details?.phone ?? null,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? null,
        postalOrZipCode: addr.postal_code,
        countryCode: addr.country,
        townOrCity: addr.city,
        stateOrCounty: addr.state ?? null,
      },
    },
    items: [
      {
        merchantReference: `${session.id}_tee`,
        sku: PRODIGI_SKU,
        copies: quantity,
        sizing: "fitPrintArea",
        attributes: { color: color.key, size },
        assets: [{ printArea: "front", url: printUrl }],
      },
    ],
    metadata: {
      stripe_session: session.id,
      stripe_payment_intent: pi.id,
      rings: String(rings),
      palette: design.palette,
    },
  });

  await s.paymentIntents.update(pi.id, {
    metadata: { prodigi_order_id: order.id, prodigi_outcome: outcome, prodigi_created_at: new Date().toISOString() },
  });
  return { status: "fulfilled", prodigiOrderId: order.id, created: outcome !== "AlreadyExists" };
}

export async function lookupProdigi(orderId: string): Promise<ProdigiOrder | null> {
  try {
    return await getProdigiOrder(orderId);
  } catch {
    return null;
  }
}
