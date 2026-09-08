// Fulfilment: turn a PAID Stripe Checkout Session into a Prodigi print order.
// Idempotent: the Prodigi order id is written back to the session metadata and
// the Prodigi idempotencyKey is the session id.
import type Stripe from "stripe";
import { PRODIGI_SKU, designFromMetadata } from "./design";
import { createProdigiOrder, ProdigiOrderRequest } from "./prodigi";
import { baseUrl, stripe } from "./stripe";
import { signDesign } from "./token";

type ShippingDetails = { name?: string | null; address?: Stripe.Address | null } | null | undefined;

function shippingFrom(session: Stripe.Checkout.Session): ShippingDetails {
  const s = session as unknown as { collected_information?: { shipping_details?: ShippingDetails }; shipping_details?: ShippingDetails };
  return s.collected_information?.shipping_details ?? s.shipping_details ?? null;
}

export interface FulfilResult {
  status: "created" | "already_fulfilled" | "not_paid";
  prodigiOrderId?: string;
}

export async function fulfilSession(sessionId: string): Promise<FulfilResult> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["shipping_cost.shipping_rate"] });
  if (session.payment_status !== "paid") return { status: "not_paid" };
  if (session.metadata?.prodigi_order_id) {
    return { status: "already_fulfilled", prodigiOrderId: session.metadata.prodigi_order_id };
  }

  const design = designFromMetadata(session.metadata);
  const quantity = Math.max(1, parseInt(session.metadata?.quantity ?? "1", 10) || 1);
  const ship = shippingFrom(session);
  const addr = ship?.address;
  if (!addr?.line1 || !addr.country || !addr.city || !addr.postal_code) {
    throw new Error(`Session ${sessionId} is paid but has no complete shipping address`);
  }

  const rate = session.shipping_cost?.shipping_rate;
  const method = (typeof rate === "object" && rate?.metadata?.prodigi_method) || "Standard";

  const token = signDesign(design);
  const assetUrl = `${baseUrl()}/api/print/${token}.png`;

  const order: ProdigiOrderRequest = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: method as ProdigiOrderRequest["shippingMethod"],
    recipient: {
      name: ship?.name || session.customer_details?.name || "Customer",
      email: session.customer_details?.email ?? undefined,
      phoneNumber: session.customer_details?.phone ?? undefined,
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
        merchantReference: `${session.id}-front`,
        sku: PRODIGI_SKU,
        copies: quantity,
        sizing: "fillPrintArea",
        attributes: { color: design.color, size: design.size },
        assets: [{ printArea: "front", url: assetUrl }],
      },
    ],
    metadata: {
      stripe_session: session.id,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? ""),
      design: `${design.title} | ${design.place} | ${design.date} ${design.time}`,
    },
  };

  const res = await createProdigiOrder(order);
  const prodigiOrderId = res.order.id;
  console.log(`fulfilled ${session.id} -> prodigi ${prodigiOrderId} (${res.outcome})`);

  await stripe().checkout.sessions.update(session.id, {
    metadata: {
      ...(session.metadata ?? {}),
      prodigi_order_id: prodigiOrderId,
      prodigi_outcome: res.outcome,
      fulfilled_at: new Date().toISOString(),
    },
  });
  if (typeof session.payment_intent === "string") {
    await stripe()
      .paymentIntents.update(session.payment_intent, { metadata: { prodigi_order_id: prodigiOrderId, checkout_session: session.id } })
      .catch(() => undefined);
  }
  return { status: "created", prodigiOrderId };
}
