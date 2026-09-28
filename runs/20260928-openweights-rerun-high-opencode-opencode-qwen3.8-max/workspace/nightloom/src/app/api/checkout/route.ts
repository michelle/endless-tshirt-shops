import { NextResponse } from 'next/server';
import { pack, sign } from '@/lib/encoding';
import { makeOrderRef, validateOrder } from '@/lib/validation';
import { createCheckoutSession, stripeEnabled } from '@/lib/stripe';
import type { OrderPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const o = (body ?? {}) as Record<string, unknown>;
  const attemptId = typeof o.attemptId === 'string' ? o.attemptId.trim().slice(0, 64) : '';
  if (!attemptId) {
    return NextResponse.json({ error: 'Missing checkout attempt id.' }, { status: 400 });
  }
  const orderRef = makeOrderRef(attemptId);
  const validated = validateOrder({ ...o, orderRef, attemptId });
  if (!validated.ok) {
    return NextResponse.json({ error: 'Please fix the highlighted fields.', errors: validated.errors }, { status: 422 });
  }
  const order: OrderPayload = validated.value;

  if (stripeEnabled()) {
    try {
      const url = await createCheckoutSession(order);
      return NextResponse.json({ mode: 'stripe', url, orderRef });
    } catch (err) {
      console.error('[nightloom] checkout session failed', err);
      return NextResponse.json(
        { error: 'Could not start checkout. Please try again.' },
        { status: 502 }
      );
    }
  }

  // Sandbox mode (no STRIPE_SECRET_KEY configured): hand off to the
  // clearly-labelled test payment page which runs the same fulfilment pipeline.
  const token = pack(order);
  const sig = sign(token);
  return NextResponse.json({
    mode: 'demo',
    orderRef,
    payUrl: `/pay?token=${token}&sig=${sig}`,
  });
}
