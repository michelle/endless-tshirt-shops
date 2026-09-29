import "server-only";
import type Stripe from "stripe";
import { PRODUCT, SHIPPING, colorByKey } from "../catalog";
import { unpackDesign } from "../design";
import { siteUrl } from "./env";
import { createProdigiOrder } from "./prodigi";
import { signedArtUrl } from "./sign";
import { stripe } from "./stripe";

export type FulfillResult =
  | { status: "unpaid" }
  | { status: "submitted"; prodigiOrderId: string; alreadyExisted: boolean };

/**
 * Sends a paid Checkout Session to Prodigi. Idempotent: guarded by the
 * PaymentIntent's metadata and by Prodigi's idempotencyKey (= session id),
 * so the webhook, its retries and the order page can all call it safely.
 */
export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillResult> {
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });

  // Only fulfil once money has actually been captured.
  if (session.payment_status !== "paid") return { status: "unpaid" };

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  if (pi?.metadata?.prodigi_order_id) {
    return { status: "submitted", prodigiOrderId: pi.metadata.prodigi_order_id, alreadyExisted: true };
  }

  const lineItems = await s.checkout.sessions.listLineItems(sessionId, { limit: 100, expand: ["data.price.product"] });

  const items = lineItems.data.map((li, i) => {
    const product = li.price?.product as Stripe.Product;
    const md = product.metadata;
    const design = unpackDesign(md.design);
    return {
      merchantReference: `${sessionId.slice(-12)}-${i + 1}`,
      sku: PRODUCT.sku,
      copies: li.quantity ?? 1,
      sizing: "fitPrintArea" as const,
      attributes: { color: colorByKey(design.color).prodigi, size: md.size },
      assets: [{ printArea: "front", url: signedArtUrl("print", design) }],
    };
  });
  if (items.length === 0) throw new Error(`Session ${sessionId} has no line items`);

  const ship = session.collected_information?.shipping_details;
  if (!ship?.address) throw new Error(`Session ${sessionId} has no shipping address`);
  const a = ship.address;

  const result = await createProdigiOrder({
    merchantReference: sessionId,
    idempotencyKey: sessionId,
    shippingMethod: SHIPPING.prodigiMethod,
    callbackUrl: `${siteUrl()}/api/prodigi/callback`,
    recipient: {
      name: ship.name,
      email: session.customer_details?.email ?? null,
      phoneNumber: session.customer_details?.phone ?? null,
      address: {
        line1: a.line1 ?? "",
        line2: a.line2 || null,
        postalOrZipCode: a.postal_code ?? "",
        countryCode: a.country ?? "",
        townOrCity: a.city ?? "",
        stateOrCounty: a.state || null,
      },
    },
    items,
    metadata: { stripeSessionId: sessionId, stripePaymentIntent: pi?.id ?? "" },
  });

  const prodigiOrderId = result.order.id;
  if (pi) {
    await s.paymentIntents.update(pi.id, { metadata: { prodigi_order_id: prodigiOrderId } });
  }
  console.log(`[fulfill] ${sessionId} -> Prodigi ${prodigiOrderId} (${result.outcome})`);
  return { status: "submitted", prodigiOrderId, alreadyExisted: result.outcome === "AlreadyExists" };
}
