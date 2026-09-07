import { checkOrigin, readJson } from '@/lib/config';
import { fulfill } from '@/lib/fulfillment';
import { stripe } from '@/lib/stripe';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
  } catch {
    return new Response('Forbidden', { status: 403 });
  }
  let id: string;
  try {
    const body = await readJson(request);
    id = body.sessionId;
    if (
      typeof id !== 'string' ||
      !/^cs_(test|live)_[a-zA-Z0-9]{20,200}$/.test(id)
    )
      throw new Error();
  } catch {
    return Response.json({ error: 'Invalid order link' }, { status: 400 });
  }
  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(id);
  } catch {
    return Response.json(
      { error: 'We couldn’t find this order. Check your confirmation link.' },
      { status: 404 },
    );
  }
  if (session.metadata?.product !== 'datetime-v1')
    return Response.json({ error: 'Order not found' }, { status: 404 });
  if (session.payment_status !== 'paid')
    return Response.json(
      {
        paid: false,
        status: session.status === 'expired' ? 'expired' : 'awaiting_payment',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  const base = {
    paid: true,
    timestamp: session.metadata.timestamp,
    fit: session.metadata.fit,
    size: session.metadata.size,
    total: session.amount_total,
    sandbox: !session.livemode,
  };
  try {
    const { order } = await fulfill(id);
    return Response.json(
      {
        ...base,
        orderId: order.id,
        status: order.status?.issues?.length
          ? 'needs_attention'
          : order.status?.stage || 'submitted',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    console.error('order_pending', {
      sessionId: id,
      message: e instanceof Error ? e.message : 'unknown',
    });
    return Response.json(
      { ...base, status: 'pending' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
