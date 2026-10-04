import type Stripe from "stripe";
import { SKU } from "./catalog";
import { encodeDesign, normalizeDesign, type Design } from "./design";
import { createOrder } from "./prodigi";
import { sign } from "./sign";
import { stripe } from "./stripe";

export interface OrderInfo {
  session: Stripe.Checkout.Session;
  paid: boolean;
  design: Design | null;
  color: string;
  size: string;
  quantity: number;
  prodigiOrderId: string | null;
}

export function printUrl(origin: string, d: Design) {
  const enc = encodeDesign(d);
  return `${origin}/api/print/${enc}.png?sig=${sign(enc)}`;
}

function shippingOf(s: Stripe.Checkout.Session) {
  return s.collected_information?.shipping_details ?? (s as any).shipping_details ?? null;
}

export async function loadOrder(sessionId: string): Promise<OrderInfo> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent", "line_items"] });
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const parsed = (() => {
    try {
      return normalizeDesign(JSON.parse(session.metadata?.design || "null"));
    } catch {
      return null;
    }
  })();
  return {
    session,
    paid: session.payment_status === "paid",
    design: parsed && parsed.ok ? parsed.design : null,
    color: session.metadata?.color || "",
    size: session.metadata?.size || "",
    quantity: session.line_items?.data?.[0]?.quantity ?? 1,
    prodigiOrderId: pi?.metadata?.prodigi_order_id || null,
  };
}

/**
 * Sends a paid Checkout Session to Prodigi exactly once.
 * Safe to call repeatedly (webhook retries, success page): we bail out if the
 * PaymentIntent already records a Prodigi order, and Prodigi dedupes on the
 * idempotency key (the Checkout Session id) if two calls race.
 */
export async function fulfill(sessionId: string, origin: string): Promise<OrderInfo> {
  const info = await loadOrder(sessionId);
  const { session } = info;
  if (!info.paid || info.prodigiOrderId) return info;
  if (!info.design) throw new Error(`Session ${sessionId} has no valid design metadata`);

  const ship = shippingOf(session);
  const addr = ship?.address;
  if (!ship || !addr?.line1 || !addr.country || (!addr.postal_code && addr.country === "US"))
    throw new Error(`Session ${sessionId} is missing a shipping address`);

  const res = await createOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: "Standard",
    recipient: {
      name: ship.name || session.customer_details?.name || "Park Ranger",
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        postalOrZipCode: addr.postal_code || "",
        countryCode: addr.country,
        townOrCity: addr.city || addr.state || "",
        stateOrCounty: addr.state || undefined,
      },
    },
    items: [
      {
        merchantReference: "park-tee",
        sku: SKU,
        copies: info.quantity,
        sizing: "fitPrintArea",
        attributes: { color: info.color, size: info.size },
        assets: [{ printArea: "front", url: printUrl(origin, info.design) }],
      },
    ],
    metadata: { stripeCheckoutSession: session.id, park: info.design.name.slice(0, 100) },
  });

  const orderId: string = res.order.id;
  const pi = session.payment_intent as Stripe.PaymentIntent;
  await stripe().paymentIntents.update(pi.id, { metadata: { prodigi_order_id: orderId } });
  console.log(`[fulfill] ${session.id} → Prodigi ${orderId} (${res.outcome})`);
  return { ...info, prodigiOrderId: orderId };
}
