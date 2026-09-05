import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const pi = typeof session.payment_intent === 'object' ? session.payment_intent : null;
    const shipping = (session as any).shipping_details || (session as any).shipping;

    return NextResponse.json({
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
      shippingName: shipping?.name,
      shippingAddress: shipping?.address,
      fit: session.metadata?.fit,
      color: session.metadata?.color,
      size: session.metadata?.size,
      theme: session.metadata?.theme,
      artworkUrl: session.metadata?.artworkUrl,
      prodigiOrderId: pi?.metadata?.prodigiOrderId || null,
      prodigiStatus: pi?.metadata?.prodigiStatus || null,
      fulfillmentError: pi?.metadata?.fulfillmentError || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Not found' }, { status: 404 });
  }
}
