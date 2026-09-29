// POST /api/stripe/webhook — Stripe webhook: fulfil on checkout.session.completed.
import { verifyWebhookSignature, retrieveCheckoutSession } from '../../../../lib/stripe';
import { fulfillSession } from '../../../../lib/fulfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function baseUrlFrom(request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return `${proto}://${host}`;
}

export async function POST(request) {
  const raw = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret) {
    const ok = verifyWebhookSignature(raw, request.headers.get('stripe-signature'), secret);
    if (!ok) return Response.json({ error: 'bad signature' }, { status: 400 });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    try {
      // re-fetch so fulfilment always works from a trusted, complete object
      const session = await retrieveCheckoutSession(event.data.object.id);
      const result = await fulfillSession(session, baseUrlFrom(request));
      return Response.json({ received: true, fulfillment: result });
    } catch (e) {
      // 500 so Stripe retries; Prodigi idempotency makes retries safe
      return Response.json({ received: false, error: e.message }, { status: 500 });
    }
  }
  return Response.json({ received: true });
}
