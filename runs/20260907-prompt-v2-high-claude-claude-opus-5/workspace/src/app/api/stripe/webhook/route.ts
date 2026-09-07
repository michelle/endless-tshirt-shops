import { NextResponse, after } from 'next/server';
import { stripe, siteOrigin } from '@/lib/stripe';
import { fulfilSession } from '@/lib/fulfil';

export const runtime = 'nodejs';
// Fulfilment runs after the response; Prodigi's create-order call alone takes ~8s.
export const maxDuration = 60;

const FULFIL_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

/**
 * Stripe gives a webhook ~20 seconds to respond, and a cold fulfilment (Stripe reads +
 * claim + Prodigi create) comfortably exceeds that. So we verify the signature, acknowledge
 * immediately, and place the order in `after()`.
 *
 * That means Stripe will not retry a failed fulfilment, so there are two safety nets:
 * the /order page (which fulfils anything still missing 90s after payment) and
 * /api/reconcile (a sweep over recent paid sessions).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature.' }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Signature check failed: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  if (!FULFIL_EVENTS.includes(event.type)) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const sessionId = (event.data.object as { id: string }).id;
  const origin = siteOrigin(req);

  after(async () => {
    try {
      const result = await fulfilSession(sessionId, origin);
      console.log(`[fulfil] ${sessionId} -> ${result.state}${result.state === 'error' ? `: ${result.error}` : ''}`);
    } catch (e) {
      console.error(`[fulfil] ${sessionId} threw`, e);
    }
  });

  return NextResponse.json({ ok: true, queued: sessionId });
}
