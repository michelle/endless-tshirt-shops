import { fulfill, json, prodigi, stripe, verify, APP } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(req: Request) {
  const url = new URL(req.url),
    id = url.searchParams.get('session_id'),
    token = url.searchParams.get('token');
  if (!id || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(id) || !token)
    return json({ error: 'Invalid order link.' }, 400);
  try {
    verify(token);
  } catch {
    return json({ error: 'Invalid order link.' }, 403);
  }
  try {
    const client = stripe();
    let s = await client.checkout.sessions.retrieve(id);
    if (s.metadata?.app !== APP || s.metadata?.access !== token)
      return json({ error: 'Order not found.' }, 404);
    let retry = false;
    if (s.payment_status === 'paid' && !s.metadata.prodigiOrderId) {
      try {
        await fulfill(id, client);
        s = await client.checkout.sessions.retrieve(id);
      } catch {
        retry = true;
      }
    }
    const stored = JSON.parse(s.metadata!.order);
    let production = null;
    if (s.metadata?.prodigiOrderId) {
      try {
        const result = await prodigi(
          `orders/${encodeURIComponent(s.metadata.prodigiOrderId)}`,
        );
        production = {
          stage: result.order.status.stage,
          issues: result.order.status.issues?.length || 0,
          shipments: result.order.shipments?.map(
            (v: {
              carrier?: { name?: string };
              tracking?: { number?: string; url?: string };
            }) => ({
              carrier: v.carrier?.name,
              trackingNumber: v.tracking?.number,
              trackingUrl: v.tracking?.url?.startsWith('https://')
                ? v.tracking.url
                : undefined,
            }),
          ),
        };
      } catch {
        retry = true;
      }
    }
    return json({
      payment: s.payment_status,
      amount: s.amount_total,
      currency: s.currency,
      design: stored.design,
      size: stored.size,
      quantity: stored.quantity,
      reference: s.id.slice(-12).toUpperCase(),
      prodigiOrderId: s.metadata?.prodigiOrderId || null,
      production,
      retry,
      sandbox: !s.livemode,
      supportEmail: process.env.SUPPORT_EMAIL || null,
    });
  } catch {
    return json(
      { error: 'Could not retrieve your order. Please try again shortly.' },
      502,
    );
  }
}
