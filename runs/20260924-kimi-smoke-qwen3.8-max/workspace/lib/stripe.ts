/**
 * Minimal Stripe client (server-only) built on plain fetch —
 * no SDK, just the two things we need:
 *   1. create a Checkout Session
 *   2. verify webhook signatures
 *
 * Activated when STRIPE_SECRET_KEY is present; otherwise the store runs
 * in sandbox TestPay mode (see app/api/payments/testpay).
 */
import crypto from 'node:crypto';
import type { OrderPayload } from './orders';
import { serverBaseUrl } from './prodigi';
import { encodeDesign } from './design';

const API = 'https://api.stripe.com/v1';

function key(): string | undefined {
  return process.env.STRIPE_SECRET_KEY;
}

export function stripeEnabled(): boolean {
  return Boolean(key());
}

async function stripeFetch(path: string, params: URLSearchParams): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe request failed (${res.status})`);
  }
  return data;
}

export async function createCheckoutSession(order: OrderPayload, token: string): Promise<{ id: string; url: string }> {
  const base = serverBaseUrl();
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('client_reference_id', order.orderId);
  p.set('customer_email', order.shipping.email);
  p.set('success_url', `${base}/thanks?session_id={CHECKOUT_SESSION_ID}&mode=stripe&t=${encodeURIComponent(token)}`);
  p.set('cancel_url', `${base}/checkout?cancel=1&d=${encodeURIComponent(encodeDesign(order.design))}`);
  p.set('metadata[orderId]', order.orderId);
  p.set('metadata[orderToken]', token);

  // line 1: the tee(s)
  p.set('line_items[0][quantity]', String(order.product.qty));
  p.set('line_items[0][price_data][currency]', order.pricing.currency);
  p.set('line_items[0][price_data][unit_amount]', String(order.pricing.unitCents));
  p.set(
    'line_items[0][price_data][product_data][name]',
    `Topographic Portrait Tee — ${order.design.label}`,
  );
  p.set(
    'line_items[0][price_data][product_data][description]',
    `Custom contour map tee · ${order.product.color}, size ${order.product.size.toUpperCase()} · Bella+Canvas 3001`,
  );

  // line 2: shipping
  p.set('line_items[1][quantity]', '1');
  p.set('line_items[1][price_data][currency]', order.pricing.currency);
  p.set('line_items[1][price_data][unit_amount]', String(order.pricing.shippingCents));
  p.set('line_items[1][price_data][product_data][name]', 'Shipping (made-to-order)');

  const session = await stripeFetch('/checkout/sessions', p);
  return { id: session.id, url: session.url };
}

/**
 * Verify a Stripe webhook signature (Stripe-Signature: t=…,v1=…).
 * Returns the parsed event, or throws.
 */
export function constructStripeEvent(rawBody: string, header: string | null, toleranceSec = 300): any {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  if (!header) throw new Error('Missing Stripe-Signature header');

  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=', 2) as [string, string]),
  );
  const t = parts['t'];
  const v1s = header.split(',').filter((kv) => kv.startsWith('v1=')).map((kv) => kv.slice(3));
  if (!t || v1s.length === 0) throw new Error('Malformed Stripe-Signature header');

  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (age > toleranceSec) throw new Error('Webhook timestamp too old');

  const signedPayload = `${t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const ok = v1s.some((v1) => {
    const a = Buffer.from(v1);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!ok) throw new Error('Signature mismatch');

  return JSON.parse(rawBody);
}
