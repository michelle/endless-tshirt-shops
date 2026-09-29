import "server-only";
import type Stripe from "stripe";
import { SHIRTS, decodeDesign } from "./design";
import { PRODIGI_SKU, type ShippingMethod } from "./catalog";
import { createOrder } from "./prodigi";
import { printUrl } from "./sign";
import { stripe, unchunkMetadata } from "./stripe";

export type FulfillResult =
  | { status: "unpaid" }
  | { status: "submitted"; prodigiOrderId: string; alreadyExisted: boolean };

/**
 * Sends a paid Checkout Session to Prodigi. Idempotent — called from the Stripe webhook
 * and again (as a fallback) from the order confirmation page.
 * Payment is always re-verified against Stripe's API; never trusts caller input.
 */
export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillResult> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "shipping_cost.shipping_rate"],
  });

  if (session.status !== "complete" || session.payment_status !== "paid") return { status: "unpaid" };

  if (session.metadata?.prodigi_order_id) {
    return { status: "submitted", prodigiOrderId: session.metadata.prodigi_order_id, alreadyExisted: true };
  }

  const design = decodeDesign(unchunkMetadata("design", session.metadata));
  const size = session.metadata?.size;
  if (!size) throw new Error(`Session ${session.id} has no size`);

  const quantity = session.line_items?.data[0]?.quantity ?? 1;
  const method = shippingMethodOf(session);
  const ship = session.collected_information?.shipping_details;
  const addr = ship?.address;
  if (!ship || !addr?.line1 || !addr.country || !addr.city) {
    throw new Error(`Session ${session.id} is missing a shipping address`);
  }

  const res = await createOrder({
    merchantReference: session.id.slice(-40),
    idempotencyKey: session.id,
    shippingMethod: method,
    recipient: {
      name: ship.name,
      email: session.customer_details?.email ?? undefined,
      phoneNumber: session.customer_details?.phone ?? undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        postalOrZipCode: addr.postal_code ?? "",
        countryCode: addr.country,
        townOrCity: addr.city,
        stateOrCounty: addr.state ?? undefined,
      },
    },
    items: [
      {
        merchantReference: "overhead-tee",
        sku: PRODIGI_SKU,
        copies: quantity,
        sizing: "fitPrintArea",
        attributes: { color: SHIRTS[design.shirt].prodigi, size },
        assets: [{ printArea: "front", url: printUrl(design) }],
      },
    ],
    metadata: { stripeCheckoutSession: session.id, title: design.title },
  });

  const prodigiOrderId = res.order.id;
  await stripe().checkout.sessions.update(session.id, {
    metadata: { prodigi_order_id: prodigiOrderId },
  });
  return { status: "submitted", prodigiOrderId, alreadyExisted: res.outcome === "AlreadyExists" };
}

function shippingMethodOf(session: Stripe.Checkout.Session): ShippingMethod {
  const rate = session.shipping_cost?.shipping_rate;
  const method = typeof rate === "object" && rate ? rate.metadata?.prodigi_method : undefined;
  return method === "Express" ? "Express" : "Standard";
}
