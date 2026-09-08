import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fulfilSession } from '@/lib/fulfil';
import { siteUrl } from '@/lib/spec';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * The only place an order is allowed to reach the press. Stripe tells us the
 * money arrived; nothing else does.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('webhook: STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig || '', secret);
  } catch (err: any) {
    console.error('webhook: bad signature', err?.message);
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as { id: string };
  try {
    const result = await fulfilSession(session.id, siteUrl(req));
    console.log('webhook: fulfilled', session.id, JSON.stringify(result));
    return NextResponse.json({ received: true, ...result });
  } catch (err: any) {
    // 500 makes Stripe retry; Prodigi's idempotency key keeps retries harmless.
    console.error('webhook: fulfilment failed', session.id, err?.message);
    return NextResponse.json({ error: 'fulfilment failed' }, { status: 500 });
  }
}
