import { NextResponse } from 'next/server';
import { stripeClient, submitProdigiOrder } from '../lib';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({error: 'Webhook signing secret is not configured.'}, {status: 503});
  try {
    const event = stripeClient().webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') || '', secret);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (!session.metadata?.prodigiOrderId) {
        const result = await submitProdigiOrder(session);
        const id = result.order?.id || 'accepted';
        await stripeClient().checkout.sessions.update(session.id, {metadata: {...session.metadata, prodigiOrderId: String(id)}});
      }
    }
    return NextResponse.json({received: true});
  } catch (error) { console.error('webhook', error); return NextResponse.json({error: 'Invalid webhook or fulfillment error.'}, {status: 400}); }
}
