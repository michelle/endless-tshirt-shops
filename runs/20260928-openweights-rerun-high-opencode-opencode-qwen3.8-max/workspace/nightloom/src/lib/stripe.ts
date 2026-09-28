// Stripe Checkout integration.
// Payments are considered successful ONLY when Stripe tells us so:
// either via the signed checkout.session.completed webhook, or (for the
// success page only) by re-retrieving the session and checking payment_status.

import Stripe from 'stripe';
import { pack, sign } from './encoding';
import { CURRENCY, SHIPPING_PRICE_CENTS, SHIRT_PRICE_CENTS, colorById } from './product';
import type { OrderPayload } from './types';

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (!client) client = new Stripe(key);
  return client;
}

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

/**
 * Order payloads travel inside Checkout metadata as signed tokens,
 * chunked to respect Stripe's 500-char metadata value limit.
 */
export function orderToMetadata(order: OrderPayload): Record<string, string> {
  const token = pack(order);
  const sig = sign(token);
  const meta: Record<string, string> = { nl: '1', nlSig: sig, orderRef: order.orderRef };
  for (let i = 0, c = 0; i < token.length; i += 400, c++) {
    meta[`nlTok${c}`] = token.slice(i, i + 400);
  }
  return meta;
}

export function metadataToToken(meta: { [k: string]: string } | null | undefined): {
  token: string;
  sig: string;
} | null {
  if (!meta || meta.nl !== '1' || !meta.nlSig) return null;
  let token = '';
  for (let c = 0; meta[`nlTok${c}`]; c++) token += meta[`nlTok${c}`];
  if (!token) return null;
  return { token, sig: meta.nlSig };
}

export async function createCheckoutSession(order: OrderPayload): Promise<string> {
  const stripe = getStripe();
  const color = colorById(order.product.color);
  const base = appUrl();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: order.shipping.email,
    line_items: [
      {
        quantity: order.product.qty,
        price_data: {
          currency: CURRENCY.toLowerCase(),
          unit_amount: SHIRT_PRICE_CENTS,
          product_data: {
            name: `Nightloom star map tee — “${order.design.name}”`,
            description: `1-of-1 custom DTG tee · ${color?.label ?? order.product.color} · size ${order.product.size.toUpperCase()} · sky of ${order.design.date} ${order.design.time} over ${order.design.placeLabel}`,
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY.toLowerCase(),
          unit_amount: SHIPPING_PRICE_CENTS,
          product_data: { name: 'Standard shipping' },
        },
      },
    ],
    metadata: orderToMetadata(order),
    client_reference_id: order.orderRef,
    success_url: `${base}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/checkout?canceled=1`,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}
