import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { createProdigiOrder, findProdigiOrderByReference, getProdigiOrder, type ProdigiOrder } from "./prodigi";
import { decodeDesign, sanitizeOrder, type Design, type Order } from "./design";
import { PRODIGI_SKU } from "./catalog";
import { siteUrl } from "./site";

export interface OrderView {
  sessionId: string;
  paid: boolean;
  status: "unpaid" | "paid";
  order: Order;
  design: Design;
  email?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  shipTo?: { name?: string | null; line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal?: string | null; country?: string | null } | null;
  fulfilment: null | {
    prodigiOrderId: string;
    stage: string;
    details: Record<string, string>;
    issues: string[];
    shipments: Array<{ carrier?: string; service?: string; trackingNumber?: string; trackingUrl?: string; dispatched?: string }>;
  };
  fulfilmentError?: string;
}

type ShippingDetails = { name?: string | null; address?: Stripe.Address | null } | null | undefined;

function shippingOf(session: Stripe.Checkout.Session): ShippingDetails {
  const s = session as unknown as { collected_information?: { shipping_details?: ShippingDetails }; shipping_details?: ShippingDetails };
  return s.collected_information?.shipping_details ?? s.shipping_details ?? null;
}

function orderFromSession(session: Stripe.Checkout.Session): Order {
  const md = session.metadata ?? {};
  const design = decodeDesign(md.design);
  return sanitizeOrder({ ...design, size: md.size, qty: md.qty });
}

function viewOfProdigi(o: ProdigiOrder): NonNullable<OrderView["fulfilment"]> {
  return {
    prodigiOrderId: o.id,
    stage: o.status?.stage ?? "Unknown",
    details: o.status?.details ?? {},
    issues: (o.status?.issues ?? []).map((i) => i.description ?? i.errorCode ?? "issue"),
    shipments: (o.shipments ?? []).map((s) => ({
      carrier: s.carrier?.name, service: s.carrier?.service, trackingNumber: s.tracking?.number, trackingUrl: s.tracking?.url, dispatched: s.dispatchDate,
    })),
  };
}

/**
 * Idempotently make sure a *paid* Checkout Session has a Prodigi order.
 * Called from the Stripe webhook (primary) and from the order page (belt and braces).
 * Safe to call repeatedly: Prodigi's idempotencyKey + our merchantReference both equal the session id.
 */
export async function ensureFulfilled(sessionId: string): Promise<OrderView> {
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  const order = orderFromSession(session);
  const paid = session.payment_status === "paid";
  const ship = shippingOf(session);
  const view: OrderView = {
    sessionId,
    paid,
    status: paid ? "paid" : "unpaid",
    order,
    design: order,
    email: session.customer_details?.email,
    amountTotal: session.amount_total,
    currency: session.currency,
    shipTo: ship ? { name: ship.name, line1: ship.address?.line1, line2: ship.address?.line2, city: ship.address?.city, state: ship.address?.state, postal: ship.address?.postal_code, country: ship.address?.country } : null,
    fulfilment: null,
  };
  if (!paid) return view;

  const pi = typeof session.payment_intent === "object" && session.payment_intent ? session.payment_intent : null;
  const knownId = pi?.metadata?.prodigi_order_id;

  try {
    // 1. Already recorded on the PaymentIntent?
    if (knownId) {
      const existing = await getProdigiOrder(knownId);
      if (existing) { view.fulfilment = viewOfProdigi(existing); return view; }
    }
    // 2. Exists at Prodigi under our reference (e.g. webhook ran but the metadata write failed)?
    const found = await findProdigiOrderByReference(sessionId);
    if (found) {
      await recordProdigiId(pi, found.id);
      view.fulfilment = viewOfProdigi(found);
      return view;
    }
    // 3. Create it.
    if (!ship?.address?.line1 || !ship.address.country || !ship.address.postal_code || !ship.address.city) {
      throw new Error("Paid session is missing a shipping address");
    }
    const printUrl = `${siteUrl()}/api/print/${encodeURIComponent(sessionId)}.png`;
    const res = await createProdigiOrder({
      merchantReference: sessionId,
      idempotencyKey: sessionId,
      shippingMethod: "Standard",
      recipient: {
        name: ship.name || session.customer_details?.name || "Customer",
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address: {
          line1: ship.address.line1,
          line2: ship.address.line2 ?? undefined,
          townOrCity: ship.address.city,
          stateOrCounty: ship.address.state ?? undefined,
          postalOrZipCode: ship.address.postal_code,
          countryCode: ship.address.country,
        },
      },
      items: [{
        merchantReference: `${sessionId}-tee`,
        sku: PRODIGI_SKU,
        copies: order.qty,
        sizing: "fitPrintArea",
        attributes: { color: order.tee, size: order.size },
        assets: [{ printArea: "front", url: printUrl }],
      }],
      metadata: { stripeSessionId: sessionId, date: order.date, caption: order.caption.slice(0, 60) },
    });
    await recordProdigiId(pi, res.order.id);
    view.fulfilment = viewOfProdigi(res.order);
    return view;
  } catch (e) {
    view.fulfilmentError = e instanceof Error ? e.message : String(e);
    throw Object.assign(e instanceof Error ? e : new Error(String(e)), { view });
  }
}

async function recordProdigiId(pi: Stripe.PaymentIntent | null, prodigiId: string) {
  if (!pi || pi.metadata?.prodigi_order_id === prodigiId) return;
  try {
    await stripe().paymentIntents.update(pi.id, { metadata: { ...pi.metadata, prodigi_order_id: prodigiId } });
  } catch (e) {
    console.warn("Could not record Prodigi order id on PaymentIntent:", e);
  }
}

/** Read-only view for pages; never throws on fulfilment failure. */
export async function orderView(sessionId: string): Promise<OrderView> {
  try {
    return await ensureFulfilled(sessionId);
  } catch (e) {
    const withView = e as { view?: OrderView };
    if (withView.view) return withView.view;
    throw e;
  }
}
