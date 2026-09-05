import type Stripe from "stripe";
import { COLORWAYS, FITS, SHIPPING } from "./catalog";
import { artworkPath, fromMetadata, orderRef, type OrderSpec } from "./order";
import { createOrder, type ProdigiOrderRequest } from "./prodigi";
import { siteUrl } from "./stripe";
import { summarize } from "./dialects";

export type FulfilResult =
  | { status: "created"; prodigiOrderId: string }
  | { status: "already"; prodigiOrderId: string }
  | { status: "skipped"; reason: string };

function recipientFrom(intent: Stripe.PaymentIntent) {
  const shipping = intent.shipping;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.country) return null;

  return {
    name: shipping.name,
    email: intent.receipt_email ?? undefined,
    phoneNumber: shipping.phone ?? undefined,
    address: {
      line1: address.line1,
      line2: address.line2 ?? undefined,
      postalOrZipCode: address.postal_code ?? "",
      countryCode: address.country,
      townOrCity: address.city ?? "",
      stateOrCounty: address.state ?? undefined,
    },
  };
}

export function buildProdigiOrder(intent: Stripe.PaymentIntent, spec: OrderSpec): ProdigiOrderRequest | null {
  const recipient = recipientFrom(intent);
  if (!recipient) return null;

  const fit = FITS[spec.fit];
  const colorway = COLORWAYS[spec.colorway];
  const ref = orderRef(intent.id);

  return {
    merchantReference: ref,
    shippingMethod: SHIPPING[spec.shipping].prodigiMethod,
    idempotencyKey: intent.id,
    recipient,
    items: [
      {
        merchantReference: `${ref}/${summarize(spec.dialect, spec.epochMs, spec.timeZone)}`.slice(0, 100),
        sku: fit.sku,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: colorway.prodigiColor, size: spec.size },
        assets: [{ printArea: "front", url: `${siteUrl()}${artworkPath(spec)}` }],
      },
    ],
  };
}

/**
 * Turn a paid intent into a Prodigi order, exactly once. The Stripe intent's
 * own metadata is the lock: if `ds_prodigiOrderId` is already there, we are
 * done. Prodigi's idempotency key is a second belt for the same braces.
 */
export async function fulfil(stripe: Stripe, intent: Stripe.PaymentIntent): Promise<FulfilResult> {
  const existing = intent.metadata?.ds_prodigiOrderId;
  if (existing) return { status: "already", prodigiOrderId: existing };

  const spec = fromMetadata(intent.metadata);
  if (!spec) return { status: "skipped", reason: "no datetime.store spec on this intent" };

  const order = buildProdigiOrder(intent, spec);
  if (!order) return { status: "skipped", reason: "no shipping address on this intent" };

  const response = await createOrder(order);
  const prodigiOrderId = response.order?.id;
  if (!prodigiOrderId) {
    throw new Error(`Prodigi accepted the request but returned no order id: ${JSON.stringify(response).slice(0, 500)}`);
  }

  await stripe.paymentIntents.update(intent.id, {
    metadata: {
      ...intent.metadata,
      ds_prodigiOrderId: prodigiOrderId,
      ds_prodigiOutcome: String(response.outcome ?? "Unknown"),
      ds_fulfilledAt: new Date().toISOString(),
    },
  });

  return { status: "created", prodigiOrderId };
}
