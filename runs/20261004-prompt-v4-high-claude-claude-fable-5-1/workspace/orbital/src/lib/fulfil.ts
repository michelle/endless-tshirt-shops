import type Stripe from "stripe";
import { stripe } from "./stripe";
import { decodeDesign, describeDesign } from "./design";
import { PRODIGI_SKU, SHIPPING_OPTIONS, shirtById, sizeById } from "./catalog";
import { artUrl } from "./sign";
import { createProdigiOrder, findProdigiOrderByReference, type ProdigiOrder, type ProdigiRecipient } from "./prodigi";

export type FulfilResult =
  | { status: "unpaid" }
  | { status: "no_address" }
  | { status: "exists"; order: ProdigiOrder }
  | { status: "created"; order: ProdigiOrder; outcome: string };

type ShippingDetails = { name?: string | null; address?: Stripe.Address | null } | null | undefined;

function shippingFromSession(s: Stripe.Checkout.Session): ShippingDetails {
  // Newer API versions put it under collected_information; older ones on shipping_details.
  const ci = (s as unknown as { collected_information?: { shipping_details?: ShippingDetails } }).collected_information;
  return ci?.shipping_details ?? (s as unknown as { shipping_details?: ShippingDetails }).shipping_details ?? null;
}

/**
 * Creates the Prodigi order for a paid Checkout Session, exactly once.
 * Safe to call from the webhook AND the order page: Prodigi de-duplicates on
 * idempotencyKey and we look up by merchantReference first.
 */
export async function ensureProdigiOrder(sessionId: string, baseUrl: string): Promise<FulfilResult> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["shipping_cost.shipping_rate", "payment_intent"],
  });
  if (session.payment_status !== "paid") return { status: "unpaid" };

  const existing = await findProdigiOrderByReference(session.id);
  if (existing) return { status: "exists", order: existing };

  const md = session.metadata ?? {};
  const encoded = md.design ?? "";
  const design = decodeDesign(encoded);
  const size = sizeById(md.size ?? "l");
  const shirt = shirtById(design.shirt);
  const qty = Math.min(5, Math.max(1, Number(md.qty ?? 1) || 1));

  const rate = session.shipping_cost?.shipping_rate as Stripe.ShippingRate | null | undefined;
  const optId = typeof rate === "object" && rate?.metadata?.option ? rate.metadata.option : "standard";
  const shippingMethod = SHIPPING_OPTIONS.find((o) => o.id === optId)?.prodigiMethod ?? "Standard";

  const ship = shippingFromSession(session);
  const addr = ship?.address;
  if (!addr?.line1 || !addr.country || !addr.city || !addr.postal_code) {
    // Cannot happen for sessions we create (address collection is required); not retryable.
    console.error(`Session ${session.id} is paid but has no complete shipping address`);
    return { status: "no_address" };
  }
  const recipient: ProdigiRecipient = {
    name: ship?.name ?? session.customer_details?.name ?? "Customer",
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
  };

  const pi = session.payment_intent;
  const res = await createProdigiOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod,
    recipient,
    items: [
      {
        merchantReference: `orbital-tee-${size.id}-${shirt.id}`,
        sku: PRODIGI_SKU,
        copies: qty,
        sizing: "fillPrintArea",
        attributes: { color: shirt.prodigi, size: size.prodigi },
        assets: [{ printArea: "front", url: artUrl(baseUrl, encoded, "print") }],
      },
    ],
    metadata: {
      stripeCheckoutSession: session.id,
      stripePaymentIntent: typeof pi === "string" ? pi : pi?.id,
      design: describeDesign(design),
    },
  });
  return { status: "created", order: res.order, outcome: res.outcome };
}
