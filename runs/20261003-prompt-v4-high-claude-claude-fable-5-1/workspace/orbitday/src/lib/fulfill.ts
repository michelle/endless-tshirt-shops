import type Stripe from "stripe";
import { stripe } from "./stripe";
import { createProdigiOrder } from "./prodigi";
import { decodeDesign, designSummary, PRODUCT } from "./design";

export interface FulfillmentResult {
  prodigiOrderId: string;
  outcome: string;
  alreadyFulfilled: boolean;
}

type ShippingDetails = { name?: string | null; address?: Stripe.Address | null } | null | undefined;

function shippingFromSession(session: Stripe.Checkout.Session): ShippingDetails {
  const ci = session.collected_information as { shipping_details?: ShippingDetails } | null | undefined;
  if (ci?.shipping_details?.address) return ci.shipping_details;
  // Older API versions exposed this at the top level
  const legacy = (session as unknown as { shipping_details?: ShippingDetails }).shipping_details;
  return legacy ?? null;
}

/**
 * Send a paid Checkout Session to Prodigi exactly once.
 *
 * Idempotent by construction:
 *  - the Stripe PaymentIntent's metadata records the Prodigi order id once created
 *  - the Prodigi order carries idempotencyKey = session id, so a concurrent retry
 *    (webhook + thank-you page) cannot create a duplicate order.
 */
export async function fulfillCheckoutSession(sessionId: string, baseUrl: string): Promise<FulfillmentResult> {
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });

  if (session.payment_status !== "paid") {
    throw new Error(`Session ${sessionId} is not paid (status: ${session.payment_status})`);
  }
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  if (pi?.metadata?.prodigi_order_id) {
    return { prodigiOrderId: pi.metadata.prodigi_order_id, outcome: pi.metadata.prodigi_outcome ?? "Created", alreadyFulfilled: true };
  }

  const token = session.metadata?.design;
  if (!token) throw new Error(`Session ${sessionId} has no design metadata`);
  const design = decodeDesign(token);
  const quantity = Math.max(1, Math.min(10, Number(session.metadata?.quantity ?? 1) || 1));

  const ship = shippingFromSession(session);
  const addr = ship?.address;
  if (!addr?.line1 || !addr.country || !addr.city || !addr.postal_code) {
    throw new Error(`Session ${sessionId} is missing a complete shipping address`);
  }

  const assetUrl = `${baseUrl}/api/art/${token}.png`;
  const summary = designSummary(design);

  const res = await createProdigiOrder({
    merchantReference: session.id,
    shippingMethod: "Standard",
    idempotencyKey: session.id,
    recipient: {
      name: ship?.name || session.customer_details?.name || "Customer",
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
    items: [
      {
        merchantReference: `orbitday-${design.shirt}-${design.size}`,
        sku: PRODUCT.sku,
        copies: quantity,
        sizing: "fitPrintArea",
        attributes: { color: design.shirt, size: design.size },
        assets: [{ printArea: "front", url: assetUrl }],
      },
    ],
    metadata: { stripe_session: session.id, design: summary.slice(0, 200) },
  });

  const okOutcomes = new Set(["created", "createdwithissues", "alreadyexists", "onhold"]);
  if (!res.order?.id || !okOutcomes.has(String(res.outcome).toLowerCase())) {
    throw new Error(`Unexpected Prodigi outcome: ${JSON.stringify(res).slice(0, 800)}`);
  }

  if (pi) {
    await s.paymentIntents.update(pi.id, {
      metadata: { prodigi_order_id: res.order.id, prodigi_outcome: res.outcome, design_summary: summary.slice(0, 450) },
    });
  }
  return { prodigiOrderId: res.order.id, outcome: res.outcome, alreadyFulfilled: false };
}
