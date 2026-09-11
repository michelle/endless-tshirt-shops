import { fulfill, json, stripe } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY)
    return json({ error: 'Webhook is not configured.' }, 503);
  const signature = req.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing signature.' }, 400);
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      await req.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return json({ error: 'Invalid signature.' }, 400);
  }
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;
    if (
      session.metadata?.app !== 'after-hours-v1' ||
      session.payment_status !== 'paid'
    )
      return json({ received: true, fulfilled: false });
    try {
      await fulfill(session.id);
    } catch (e) {
      console.error('fulfillment_failed', {
        sessionId: session.id,
        message: (e as Error).message,
      });
      return json({ error: 'Fulfillment pending; retry required.' }, 500);
    }
  }
  return json({ received: true });
}
