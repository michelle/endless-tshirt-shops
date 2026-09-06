import { headers } from 'next/headers';
import { getStripe } from '../../../../lib/stripe';
import { fulfillCheckoutSession } from '../../../../lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(request) {
  const headerList = await headers();
  const signature = headerList.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response('Webhook signing is not configured', { status: 400 });

  try {
    const payload = await request.text();
    const event = getStripe().webhooks.constructEvent(payload, signature, secret);
    if (event.type === 'checkout.session.completed') {
      await fulfillCheckoutSession(event.data.object);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error('stripe webhook error', error);
    return new Response('Webhook error', { status: 400 });
  }
}
