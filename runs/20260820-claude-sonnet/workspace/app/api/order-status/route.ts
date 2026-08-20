import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/fulfill';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ status: 'unpaid' });
  }

  const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
  const metadata = paymentIntent?.metadata || {};

  let status = metadata.fulfillment_status || 'pending';
  let orderId: string | null = metadata.sp_order_id || null;
  let error: string | null = metadata.fulfillment_error || null;

  // The webhook may not be configured in this environment (e.g. a restricted
  // sandbox API key that can't register webhook endpoints), so fall back to
  // fulfilling here. fulfillCheckoutSession() is idempotent and no-ops once
  // the order has already been placed or permanently failed.
  if (status === 'pending') {
    const result = await fulfillCheckoutSession(session);
    status = result.status;
    orderId = result.orderId || null;
    error = result.error || null;
  }

  return NextResponse.json({
    status,
    orderId,
    error,
    style: session.metadata?.style,
    size: session.metadata?.size,
    email: session.customer_details?.email,
  });
}
