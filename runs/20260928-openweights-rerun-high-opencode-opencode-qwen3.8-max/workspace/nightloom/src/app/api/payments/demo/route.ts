// Sandbox test payment endpoint.
// ONLY active when Stripe is not configured (no STRIPE_SECRET_KEY).
// If Stripe is configured this route is dead — real payments must go
// through Stripe Checkout + the signed webhook, so an order can never be
// sent to Prodigi without a successful payment.

import { NextResponse } from 'next/server';
import { unpack, verify } from '@/lib/encoding';
import { fulfillPaidOrder } from '@/lib/fulfillment';
import { stripeEnabled } from '@/lib/stripe';
import { validateOrder } from '@/lib/validation';
import type { OrderPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (stripeEnabled()) {
    return NextResponse.json(
      { error: 'Live payments are configured; sandbox payments are disabled.' },
      { status: 403 }
    );
  }
  let body: { token?: string; sig?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { token, sig } = body;
  if (!token || !sig || !verify(token, sig)) {
    return NextResponse.json({ error: 'Invalid order token.' }, { status: 400 });
  }
  const order = validateOrder(unpack<OrderPayload>(token));
  if (!order.ok) {
    return NextResponse.json({ error: 'Invalid order.', errors: order.errors }, { status: 422 });
  }
  try {
    const result = await fulfillPaidOrder(order.value);
    return NextResponse.json({
      ok: true,
      orderRef: order.value.orderRef,
      prodigiOrderId: result.prodigiOrderId,
      outcome: result.outcome,
    });
  } catch (err) {
    console.error('[nightloom] sandbox fulfilment failed', err);
    return NextResponse.json(
      { error: `Fulfilment failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}
