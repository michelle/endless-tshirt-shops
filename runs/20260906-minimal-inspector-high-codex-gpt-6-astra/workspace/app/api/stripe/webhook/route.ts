import { stripe } from '@/lib/stripe';
import { required } from '@/lib/config';
import { fulfill } from '@/lib/fulfillment';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      await request.text(),
      signature,
      required('STRIPE_WEBHOOK_SECRET'),
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;
    if (session.payment_status === 'paid')
      try {
        await fulfill(session.id);
      } catch (e) {
        console.error('fulfillment_failed', {
          sessionId: session.id,
          eventId: event.id,
          message: e instanceof Error ? e.message : 'unknown',
        });
        return Response.json(
          { error: 'Fulfillment pending; retry required' },
          { status: 500 },
        );
      }
  }
  return Response.json({ received: true });
}
