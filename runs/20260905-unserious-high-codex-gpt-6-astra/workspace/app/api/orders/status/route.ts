import { NextResponse } from 'next/server';
import { stripeClient, storeId, isTestMode, safeError } from '@/lib/server';
import { fulfillSession } from '@/lib/fulfillment';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('session_id');
  if (!id || !/^cs_(test|live)_[A-Za-z0-9]{20,200}$/.test(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  try {
    const session = await stripeClient().checkout.sessions.retrieve(id);
    if (session.metadata?.store_id !== storeId()) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    const paid = session.payment_status === 'paid' && session.status === 'complete';
    let order;
    let fulfillment = paid ? 'processing' : 'unpaid';
    if (paid) {
      try {
        ({ order } = await fulfillSession(id));
        fulfillment = order.status.issues?.length ? 'attention' : 'submitted';
      } catch (error) { safeError('status_fulfillment_pending', error); }
    }
    return NextResponse.json({ paid, fulfillment, testMode: isTestMode(), timestamp: Number(session.metadata?.timestamp), style: session.metadata?.style, size: session.metadata?.size, amount: session.amount_total, currency: session.currency, orderId: order?.id || session.metadata?.prodigi_order_id || null, stage: order?.status.stage || null, tracking: order?.shipments?.map(s => s.tracking).filter(Boolean) || [], artworkUrl: paid ? `/api/artwork/${session.metadata?.artwork_token}` : null }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { safeError('order_status_failed', error); return NextResponse.json({ error: 'We could not load that order. Check your confirmation link and try again.' }, { status: 404 }); }
}
