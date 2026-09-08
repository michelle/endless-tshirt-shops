import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession, FulfillmentError } from '@/lib/fulfillment';

export const runtime = 'nodejs';

// Used by the /success page. Doubles as a fallback fulfillment trigger:
// if the webhook hasn't landed yet (or ever), visiting the success page
// itself ensures the Prodigi order gets placed — safely, because it uses
// the same idempotencyKey (the session id) as the webhook does.
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: 'Unknown session' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({
      paid: false,
      paymentStatus: session.payment_status,
    });
  }

  try {
    const result = await fulfillCheckoutSession(session);
    return NextResponse.json({
      paid: true,
      orderId: result.order?.id ?? null,
      outcome: result.outcome,
      seedText: session.metadata?.seedText ?? null,
      style: session.metadata?.style ?? null,
    });
  } catch (err) {
    const message = err instanceof FulfillmentError ? err.message : 'Fulfillment error';
    console.error('order-status fulfillment check failed', err);
    return NextResponse.json(
      {
        paid: true,
        orderId: null,
        error: message,
        seedText: session.metadata?.seedText ?? null,
        style: session.metadata?.style ?? null,
      },
      { status: 200 },
    );
  }
}
