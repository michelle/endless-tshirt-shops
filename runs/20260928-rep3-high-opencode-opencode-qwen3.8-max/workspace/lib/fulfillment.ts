// Fulfilment: the ONLY path that sends a shirt to Prodigi. It runs from the
// Stripe webhook (and as an idempotent fallback from the order-status page)
// and refuses to do anything unless Stripe says the checkout is paid.
import { createHash } from 'node:crypto';
import type Stripe from 'stripe';
import { createProdigiOrder } from './prodigi';
import { appUrl, stripe } from './stripe';
import {
  designParamsSchema,
  productSchema,
  PRICE_SHIRT_CENTS,
  PRODIGI_SKU,
  validateProduct,
  type DesignParams,
  type Product,
} from './types';

export interface SessionDesign {
  design: DesignParams;
  product: Product;
}

export function parseSessionDesign(session: Stripe.Checkout.Session): SessionDesign {
  const designRaw = session.metadata?.design;
  const productRaw = session.metadata?.product;
  if (!designRaw || !productRaw) throw new Error('session is missing design metadata');
  const design = designParamsSchema.parse(JSON.parse(designRaw));
  const product = productSchema.parse(JSON.parse(productRaw));
  validateProduct(product);
  return { design, product };
}

export type FulfillResult =
  | { status: 'unpaid' }
  | { status: 'already_fulfilled'; prodigiOrderId: string }
  | { status: 'fulfilled'; prodigiOrderId: string; outcome: string }
  | { status: 'error'; error: string };

/**
 * Send a paid checkout session to Prodigi. Idempotent on three levels:
 * Stripe metadata (fast path), Prodigi idempotencyKey (duplicate webhooks),
 * and the payment_status gate (never prints an unpaid order).
 */
export async function fulfillPaidSession(
  sessionId: string
): Promise<FulfillResult> {
  const s = stripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await s.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    return { status: 'error', error: `could not retrieve checkout session: ${(e as Error).message}` };
  }

  if (session.payment_status !== 'paid') return { status: 'unpaid' };
  const existing = session.metadata?.prodigiOrderId;
  if (existing) return { status: 'already_fulfilled', prodigiOrderId: existing };

  try {
    const { design, product } = parseSessionDesign(session);
    const shipping = session.shipping_details;
    if (!shipping?.address?.line1 || !shipping.address.country || !shipping.address.postal_code) {
      return { status: 'error', error: 'checkout session has no usable shipping address' };
    }
    const email = session.customer_details?.email ?? session.customer_email ?? undefined;

    const res = await createProdigiOrder({
      merchantReference: session.id,
      idempotencyKey: session.id,
      shippingMethod: 'Standard',
      recipient: {
        name: shipping.name || email || 'Customer',
        email,
        address: {
          line1: shipping.address.line1,
          line2: shipping.address.line2 ?? undefined,
          postalOrZipCode: shipping.address.postal_code,
          countryCode: shipping.address.country,
          townOrCity: shipping.address.city ?? '',
          stateOrCounty: shipping.address.state ?? undefined,
        },
      },
      items: [
        {
          merchantReference: `${session.id}-1`,
          sku: PRODIGI_SKU,
          copies: 1,
          sizing: 'fitPrintArea',
          attributes: { color: product.color, size: product.size },
          recipientCost: {
            amount: (PRICE_SHIRT_CENTS / 100).toFixed(2),
            currency: 'USD',
          },
          assets: [
            {
              printArea: 'front',
              url: `${appUrl()}/api/asset/${session.id}.png`,
              md5Hash: undefined,
            },
          ],
        },
      ],
      metadata: { stripeSession: session.id, store: 'starryborn' },
    });

    const orderId = res.order?.id;
    if (!orderId) return { status: 'error', error: `Prodigi returned no order id (outcome: ${res.outcome})` };

    await s.checkout.sessions.update(session.id, {
      metadata: { prodigiOrderId: orderId, prodigiOutcome: res.outcome },
    });
    return { status: 'fulfilled', prodigiOrderId: orderId, outcome: res.outcome };
  } catch (e) {
    return { status: 'error', error: (e as Error).message };
  }
}

/** Deterministic asset URL Prodigi will fetch after payment. */
export function assetUrl(sessionId: string): string {
  return `${appUrl()}/api/asset/${sessionId}.png`;
}

export function md5(buf: Buffer): string {
  return createHash('md5').update(buf).digest('hex');
}
