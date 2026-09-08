import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { createProdigiOrder, ProdigiRecipient } from "./prodigi";
import { decodeDesign, Design } from "./design";
import { signDesign } from "./signing";
import { siteUrl } from "./site";
import { PRODIGI_SKU, garmentByKey, isSize } from "./catalog";

export interface FulfillmentResult {
  status: "created" | "already_fulfilled" | "skipped_unpaid";
  prodigiOrderId?: string;
}

/**
 * Send a *paid* Checkout Session to Prodigi exactly once.
 *
 * Safety properties:
 *  - refuses anything that is not payment_status === "paid"
 *  - idempotent: Prodigi order id is stored on the PaymentIntent metadata, and
 *    the Prodigi request carries the session id as its idempotencyKey, so a
 *    retried webhook can never print two shirts.
 */
export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillmentResult> {
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent", "line_items"] });

  if (session.payment_status !== "paid") return { status: "skipped_unpaid" };

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  if (pi?.metadata?.prodigi_order_id) {
    return { status: "already_fulfilled", prodigiOrderId: pi.metadata.prodigi_order_id };
  }

  const design = decodeDesign(session.metadata?.design ?? "");
  const size = session.metadata?.size ?? "";
  const quantity = Number(session.metadata?.quantity ?? "1");
  if (!design) throw new Error(`Session ${sessionId} has no valid design metadata`);
  if (!isSize(size)) throw new Error(`Session ${sessionId} has invalid size ${size}`);
  const garment = garmentByKey(design.garment);
  if (!garment) throw new Error(`Session ${sessionId} has unknown garment ${design.garment}`);

  const recipient = recipientFromSession(session);
  const assetUrl = printAssetUrl(design);

  const order = await createProdigiOrder({
    merchantReference: sessionId,
    idempotencyKey: sessionId,
    shippingMethod: "Standard",
    recipient,
    items: [
      {
        merchantReference: `${sessionId}-tee`,
        sku: PRODIGI_SKU,
        copies: Math.min(Math.max(1, Math.round(quantity)), 5),
        sizing: "fitPrintArea",
        attributes: { color: garment.prodigi, size },
        assets: [{ printArea: "front", url: assetUrl }],
      },
    ],
    metadata: {
      stripe_session: sessionId,
      stripe_payment_intent: pi?.id ?? "",
      plant: `${design.name} / ${design.climate} / ${design.date || "no date"}`,
    },
  });

  if (pi) {
    await s.paymentIntents.update(pi.id, {
      metadata: {
        prodigi_order_id: order.id,
        prodigi_stage: order.status?.stage ?? "",
        fulfilled_at: new Date().toISOString(),
      },
    });
  }

  return { status: "created", prodigiOrderId: order.id };
}

export function printAssetUrl(design: Design): string {
  return `${siteUrl()}/api/print/${signDesign(design)}.png`;
}

export function previewImageUrl(design: Design): string {
  return `${siteUrl()}/api/print/${signDesign(design)}.png?size=preview`;
}

function recipientFromSession(session: Stripe.Checkout.Session): ProdigiRecipient {
  // Newer Stripe API versions expose the shipping address here; older ones on shipping_details.
  const legacy = (session as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;
  const shipping = session.collected_information?.shipping_details ?? legacy ?? null;
  const address = shipping?.address ?? session.customer_details?.address ?? null;
  const name = shipping?.name || session.customer_details?.name || "";
  if (!address?.line1 || !address.country || !address.city || !address.postal_code) {
    throw new Error(`Session ${session.id} is missing a complete shipping address`);
  }
  return {
    name: name || "Customer",
    email: session.customer_details?.email ?? undefined,
    phoneNumber: session.customer_details?.phone ?? undefined,
    address: {
      line1: address.line1,
      line2: address.line2 ?? undefined,
      townOrCity: address.city,
      stateOrCounty: address.state ?? undefined,
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
    },
  };
}
