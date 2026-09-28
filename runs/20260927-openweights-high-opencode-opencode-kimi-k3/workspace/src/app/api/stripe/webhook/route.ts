import { createHmac, timingSafeEqual } from 'node:crypto';
import { fulfillStripeSession } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifySignature(body: string, header: string, secret: string): boolean {
  const parts = new Map<string, string[]>();
  for (const kv of header.split(',')) {
    const idx = kv.indexOf('=');
    if (idx === -1) continue;
    const k = kv.slice(0, idx).trim();
    const v = kv.slice(idx + 1).trim();
    if (!parts.has(k)) parts.set(k, []);
    parts.get(k)!.push(v);
  }
  const t = parts.get('t')?.[0];
  const v1s = parts.get('v1') || [];
  if (!t || v1s.length === 0) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(t, 10)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  const expBuf = Buffer.from(expected, 'hex');
  return v1s.some((v) => {
    try {
      const buf = Buffer.from(v, 'hex');
      return buf.length === expBuf.length && timingSafeEqual(buf, expBuf);
    } catch {
      return false;
    }
  });
}

/**
 * Stripe webhook: the authoritative "payment succeeded" signal. Only after this
 * (or after the order page observes payment_status=paid) do we submit to Prodigi.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: 'webhook secret not configured' }, { status: 500 });
  }
  const body = await req.text();
  const header = req.headers.get('stripe-signature') || '';
  if (!verifySignature(body, header, secret)) {
    return Response.json({ error: 'invalid signature' }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: { id?: string } } };
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' && event.data?.object?.id) {
    const result = await fulfillStripeSession(event.data.object.id);
    // 500 only when a retry could succeed (transient failures). Deterministic
    // problems (not ours, unpaid, bad payload) are acked with 200 so Stripe
    // does not retry forever — the order page surfaces them to the customer.
    if (result.state === 'error' && result.transient) {
      return Response.json({ received: true, fulfilled: false, error: result.error }, { status: 500 });
    }
    return Response.json({
      received: true,
      state: result.state,
      fulfilled: result.state === 'fulfilled',
      order: result.prodigiOrderId,
      error: result.error,
    });
  }

  return Response.json({ received: true });
}
