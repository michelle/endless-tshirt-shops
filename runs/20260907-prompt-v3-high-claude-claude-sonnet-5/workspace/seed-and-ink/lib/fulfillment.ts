import Stripe from 'stripe';
import { createProdigiOrder, ProdigiOrderResult } from './prodigi';
import { PRODIGI_SKU } from './config';

// Shared by both the Stripe webhook (the primary fulfillment path) and the
// /success page's status check (a fallback in case the webhook is ever
// delayed or missed). Both call this with the same idempotencyKey
// (the Checkout Session id), so Prodigi de-dupes automatically — whichever
// caller runs first creates the print order, the other just gets it back.
// No database needed to avoid double-printing a shirt.

export class FulfillmentError extends Error {}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<ProdigiOrderResult> {
  if (session.payment_status !== 'paid') {
    throw new FulfillmentError(
      `Refusing to place a print order for unpaid session ${session.id} (payment_status=${session.payment_status})`,
    );
  }

  const meta = session.metadata || {};
  const { designFrontUrl, designBackUrl, shirtColor, size, quantity } = meta;
  if (!designFrontUrl || !shirtColor || !size) {
    throw new FulfillmentError(
      `Session ${session.id} is missing required design metadata`,
    );
  }

  const address = session.shipping_details?.address ?? session.customer_details?.address;
  const name =
    session.shipping_details?.name || session.customer_details?.name || 'Seed & Ink customer';

  if (!address || !address.line1 || !address.city || !address.country) {
    throw new FulfillmentError(
      `Session ${session.id} has no usable shipping address`,
    );
  }

  const assets = [{ printArea: 'front', url: designFrontUrl }];
  if (designBackUrl) assets.push({ printArea: 'back', url: designBackUrl });

  return createProdigiOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    recipient: {
      name,
      email: session.customer_details?.email ?? undefined,
      phoneNumber: session.customer_details?.phone ?? undefined,
      address: {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        townOrCity: address.city,
        stateOrCounty: address.state ?? undefined,
        postalOrZipCode: address.postal_code ?? '',
        countryCode: address.country,
      },
    },
    items: [
      {
        sku: PRODIGI_SKU,
        copies: Number(quantity) || 1,
        sizing: 'fillPrintArea',
        attributes: { color: shirtColor, size },
        assets,
      },
    ],
  });
}
