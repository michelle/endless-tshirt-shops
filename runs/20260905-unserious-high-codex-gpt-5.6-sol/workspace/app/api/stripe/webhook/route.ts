import { fulfillCheckout } from '@/lib/fulfill';
import { getStripe } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response('Webhook is not configured.', { status: 503 });

  try {
    const event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
    if (event.type === 'checkout.session.completed') await fulfillCheckout(event.data.object.id);
    return Response.json({ received: true });
  } catch {
    return new Response('Invalid webhook or fulfillment failure.', { status: 400 });
  }
}
