import { NextResponse } from 'next/server';
import { CURRENCY, PRICE_CENTS } from '@/lib/product';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Best-effort abuse brake. Serverless instances are not shared, so this only
 * slows down a single hot lambda — enough to stop an accidental retry storm,
 * not a substitute for a real edge rate limiter.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) hits.clear();
  return recent.length > RATE_LIMIT_MAX;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Opens an empty order so the browser can mount Stripe Elements against a real
 * PaymentIntent. Deriving the Payment Element from the intent (rather than from
 * deferred-mode options) is what guarantees the shopper is never offered a
 * payment method this intent cannot actually take.
 *
 * The shirt itself — timestamp, cut, size, address — is attached later by
 * `POST /api/orders/[id]/prepare`, once the shopper commits.
 */
export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return NextResponse.json({ error: 'Too many attempts. Give it a minute.' }, { status: 429 });
  }

  try {
    const paymentIntent = await stripe().paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      // Authorise now, capture only once Prodigi has accepted the print job.
      capture_method: 'manual',
      // Cards only, which still covers Apple Pay and Google Pay. Redirect-based
      // methods are out of scope: this flow settles in-page and needs the
      // outcome before it can fulfil.
      payment_method_types: ['card'],
      description: 'datetime.store — one t-shirt',
      statement_descriptor_suffix: 'DATETIME',
      metadata: { fulfillment_state: 'draft' },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderRef: paymentIntent.id,
      amount: PRICE_CENTS,
      currency: CURRENCY,
    });
  } catch (error) {
    console.error('[checkout] could not open an order', error);
    return NextResponse.json({ error: 'Checkout is temporarily unavailable.' }, { status: 502 });
  }
}
