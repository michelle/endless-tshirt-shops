import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { createProdigiOrder, getProdigiOrder, type ProdigiOrder } from "./prodigi";
import { COLOR_BY_ID, PRODIGI_SKU, findCode, isDesignStyle, isSize, printFileName } from "./catalog";
import { siteUrl } from "./site";

/**
 * Fulfilment is keyed entirely off the Stripe Checkout Session:
 *  - the session metadata holds the tee spec (code/style/color/size)
 *  - the PaymentIntent metadata records the Prodigi order id once placed
 *  - Prodigi's idempotencyKey (= session id) guards against double orders
 * so there is no database to keep in sync.
 */

export interface FulfilmentResult {
  prodigiOrderId: string | null;
  outcome: string;
  alreadyFulfilled: boolean;
}

export function shippingDetails(session: Stripe.Checkout.Session): { name: string; address: Stripe.Address } | null {
  const s = session.collected_information?.shipping_details;
  if (s?.address) return { name: s.name ?? "", address: s.address };
  return null;
}

async function paymentIntentOf(session: Stripe.Checkout.Session): Promise<Stripe.PaymentIntent | null> {
  const pi = session.payment_intent;
  if (!pi) return null;
  if (typeof pi !== "string") return pi;
  return stripe().paymentIntents.retrieve(pi);
}

export async function ensureFulfilled(sessionId: string): Promise<FulfilmentResult> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (session.payment_status !== "paid") {
    return { prodigiOrderId: null, outcome: `not paid (${session.payment_status})`, alreadyFulfilled: false };
  }
  const pi = await paymentIntentOf(session);
  if (pi?.metadata?.prodigi_order_id) {
    return { prodigiOrderId: pi.metadata.prodigi_order_id, outcome: "already placed", alreadyFulfilled: true };
  }

  const m = session.metadata ?? {};
  const status = findCode(m.code ?? "");
  const color = COLOR_BY_ID.get(m.color ?? "");
  if (!status || !color || !isDesignStyle(m.style) || !isSize(m.size)) {
    throw new Error(`Session ${sessionId} has invalid tee metadata: ${JSON.stringify(m)}`);
  }
  const ship = shippingDetails(session);
  if (!ship) throw new Error(`Session ${sessionId} has no shipping address`);
  const copies = Number(m.quantity ?? "1") || 1;

  const printUrl = `${siteUrl()}/print/${printFileName(status.code, m.style, color.ink)}`;

  const res = await createProdigiOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: "Standard",
    recipient: {
      name: ship.name || session.customer_details?.name || "Customer",
      email: session.customer_details?.email ?? undefined,
      phoneNumber: session.customer_details?.phone ?? undefined,
      address: {
        line1: ship.address.line1 ?? "",
        line2: ship.address.line2 ?? undefined,
        townOrCity: ship.address.city ?? "",
        stateOrCounty: ship.address.state ?? undefined,
        postalOrZipCode: ship.address.postal_code ?? "",
        countryCode: ship.address.country ?? "",
      },
    },
    items: [
      {
        merchantReference: `${status.code}-${m.style}-${color.id}-${m.size}`,
        sku: PRODIGI_SKU,
        copies,
        sizing: "fillPrintArea",
        attributes: { color: color.id, size: m.size },
        assets: [{ printArea: "front", url: printUrl }],
      },
    ],
    metadata: { stripe_session: session.id, code: String(status.code), style: m.style },
  });

  const orderId = res.order?.id ?? null;
  if (pi && orderId) {
    await stripe().paymentIntents.update(pi.id, {
      metadata: { ...pi.metadata, prodigi_order_id: orderId, prodigi_outcome: res.outcome, prodigi_env: process.env.PRODIGI_API_URL?.includes("sandbox") === false ? "live" : "sandbox" },
    });
  }
  return { prodigiOrderId: orderId, outcome: res.outcome, alreadyFulfilled: res.outcome === "AlreadyExists" };
}

export interface OrderView {
  sessionId: string;
  paymentStatus: string;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  spec: { code: number; phrase: string; style: string; color: string; size: string; quantity: number } | null;
  shipTo: { name: string; address: Stripe.Address } | null;
  prodigi: { id: string; stage: string; issues: string[]; shipments: ProdigiOrder["shipments"]; error?: string } | null;
}

/** Everything the order page needs, gathered from Stripe and Prodigi. */
export async function loadOrder(sessionId: string): Promise<OrderView | null> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  } catch {
    return null;
  }
  const m = session.metadata ?? {};
  const status = findCode(m.code ?? "");
  const pi = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const prodigiId = pi?.metadata?.prodigi_order_id ?? null;

  let prodigi: OrderView["prodigi"] = null;
  if (prodigiId) {
    try {
      const { order } = await getProdigiOrder(prodigiId);
      prodigi = {
        id: order.id,
        stage: order.status?.stage ?? "Unknown",
        issues: (order.status?.issues ?? []).map((i) => `${i.errorCode}: ${i.description}`),
        shipments: order.shipments ?? [],
      };
    } catch (e) {
      prodigi = { id: prodigiId, stage: "Unknown", issues: [], shipments: [], error: (e as Error).message };
    }
  }

  return {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    email: session.customer_details?.email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    spec: status
      ? { code: status.code, phrase: status.phrase, style: m.style, color: m.color, size: m.size, quantity: Number(m.quantity ?? 1) }
      : null,
    shipTo: shippingDetails(session),
    prodigi,
  };
}
