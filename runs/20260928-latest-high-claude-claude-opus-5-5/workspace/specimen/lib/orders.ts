import "server-only";
import type Stripe from "stripe";
import { put } from "@vercel/blob";
import { stripe } from "./stripe";
import { createOrder, getOrder, ProdigiOrder } from "./prodigi";
import { Design, designFromMetadata } from "./design";
import { PRODIGI_SKU, SHIPPING_OPTIONS, colorById, sizeById } from "./catalog";
import { renderPrintPng } from "./render";
import { siteUrl } from "./site";

export const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

type LoadedSession = Stripe.Checkout.Session & {
  line_items: Stripe.ApiList<Stripe.LineItem>;
  payment_intent: Stripe.PaymentIntent | null;
};

export async function loadSession(sessionId: string): Promise<LoadedSession> {
  if (!SESSION_ID_RE.test(sessionId)) throw new Error("Invalid session id");
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product", "payment_intent", "shipping_cost.shipping_rate"],
  });
  return session as LoadedSession;
}

function lineDesigns(session: LoadedSession): { design: Design; quantity: number; amount: number }[] {
  return session.line_items.data.map((li) => {
    const product = li.price?.product as Stripe.Product;
    return { design: designFromMetadata(product.metadata), quantity: li.quantity ?? 1, amount: li.amount_total };
  });
}

function shippingMethod(session: Stripe.Checkout.Session) {
  const rate = session.shipping_cost?.shipping_rate;
  const id = rate && typeof rate === "object" ? rate.metadata?.shipping_id : undefined;
  return (SHIPPING_OPTIONS.find((o) => o.id === id) ?? SHIPPING_OPTIONS[0]).prodigiMethod;
}

export type FulfillResult =
  | { state: "not_paid" }
  | { state: "already_fulfilled"; prodigiOrderId: string }
  | { state: "fulfilled"; prodigiOrderId: string; outcome: string };

/**
 * Sends a *paid* Checkout Session to Prodigi. Safe to call many times for the same session:
 *  - it re-checks payment_status with Stripe (never trusts the caller),
 *  - skips if a Prodigi order id is already recorded on the PaymentIntent,
 *  - uses the Checkout Session id as Prodigi's idempotencyKey so concurrent calls can't double-order.
 */
export async function fulfillSession(sessionId: string): Promise<FulfillResult> {
  const session = await loadSession(sessionId);
  if (session.payment_status !== "paid") return { state: "not_paid" };
  const pi = session.payment_intent;
  if (pi?.metadata?.prodigi_order_id) return { state: "already_fulfilled", prodigiOrderId: pi.metadata.prodigi_order_id };

  const ship = session.collected_information?.shipping_details;
  const addr = ship?.address;
  if (!ship || !addr?.line1 || !addr.country || !addr.city || !addr.postal_code) {
    throw new Error(`Session ${session.id} is missing a shipping address`);
  }

  const lines = lineDesigns(session);
  const items: Parameters<typeof createOrder>[0]["items"] = [];
  for (const [i, { design, quantity }] of lines.entries()) {
    const png = renderPrintPng(design);
    const blob = await put(`prints/${session.id}/item-${i + 1}.png`, png, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    items.push({
      merchantReference: `item-${i + 1}`,
      sku: PRODIGI_SKU,
      copies: quantity,
      sizing: "fillPrintArea",
      attributes: { color: colorById(design.color)!.prodigi, size: sizeById(design.size)!.prodigi },
      assets: [{ printArea: "front", url: blob.url }],
    });
  }

  const { outcome, order } = await createOrder({
    merchantReference: session.id.slice(-40),
    idempotencyKey: session.id,
    shippingMethod: shippingMethod(session),
    callbackUrl: `${siteUrl()}/api/prodigi/callback`,
    recipient: {
      name: ship.name || session.customer_details?.name || "Customer",
      email: session.customer_details?.email ?? undefined,
      phoneNumber: session.customer_details?.phone ?? undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        postalOrZipCode: addr.postal_code,
        countryCode: addr.country,
        townOrCity: addr.city,
        stateOrCounty: addr.state ?? undefined,
      },
    },
    items,
    metadata: { stripeCheckoutSession: session.id },
  });

  if (pi) {
    await stripe().paymentIntents.update(pi.id, {
      metadata: { prodigi_order_id: order.id, prodigi_outcome: outcome, fulfilled_at: new Date().toISOString() },
    });
  }
  console.log(`[fulfill] session=${session.id} prodigi=${order.id} outcome=${outcome}`);
  return { state: "fulfilled", prodigiOrderId: order.id, outcome };
}

export type OrderSummary = {
  id: string;
  paid: boolean;
  status: string;
  email: string | null;
  shipTo: string | null;
  created: number;
  paidAt: number;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  shippingLabel: string;
  items: { design: Design; quantity: number; amount: number }[];
  prodigi: ProdigiOrder | null;
  prodigiOrderId: string | null;
};

export async function orderSummary(sessionId: string): Promise<OrderSummary> {
  const session = await loadSession(sessionId);
  const prodigiOrderId = session.payment_intent?.metadata?.prodigi_order_id ?? null;
  let prodigi: ProdigiOrder | null = null;
  if (prodigiOrderId) {
    try {
      prodigi = await getOrder(prodigiOrderId);
    } catch (e) {
      console.error("[order] prodigi lookup failed", e);
    }
  }
  const ship = session.collected_information?.shipping_details;
  const rate = session.shipping_cost?.shipping_rate;
  return {
    id: session.id,
    paid: session.payment_status === "paid",
    status: session.status ?? "open",
    email: session.customer_details?.email ?? null,
    shipTo: ship ? [ship.name, ship.address?.city, ship.address?.country].filter(Boolean).join(", ") : null,
    created: session.created,
    paidAt: session.payment_intent?.created ?? session.created,
    currency: session.currency ?? "usd",
    subtotal: session.amount_subtotal ?? 0,
    shipping: session.shipping_cost?.amount_total ?? 0,
    total: session.amount_total ?? 0,
    shippingLabel: rate && typeof rate === "object" ? rate.display_name ?? "Shipping" : "Shipping",
    items: lineDesigns(session),
    prodigi,
    prodigiOrderId,
  };
}
