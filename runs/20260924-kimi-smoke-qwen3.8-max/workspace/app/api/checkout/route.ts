import { NextRequest, NextResponse } from 'next/server';
import { verifyOrderToken } from '@/lib/orders';
import { createCheckoutSession, stripeEnabled } from '@/lib/stripe';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/checkout { token }
 * Creates a Stripe Checkout Session for a signed order token.
 * Active only when STRIPE_SECRET_KEY is configured.
 */
export async function POST(req: NextRequest) {
  if (!stripeEnabled()) {
    return NextResponse.json(
      { error: 'Stripe is not configured on this deployment; use the sandbox payment form.' },
      { status: 400 },
    );
  }
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const order = verifyOrderToken(body.token ?? '');
  if (!order) return NextResponse.json({ error: 'Invalid order token.' }, { status: 400 });

  try {
    const session = await createCheckoutSession(order, body.token as string);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('stripe checkout error', (e as Error).message);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
  }
}
