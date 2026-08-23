import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createScalablePressOrder } from '../../../../lib/scalable-press';

export const runtime = 'nodejs';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-07-29.dahlia' }) : null;

export async function POST(request: Request) {
  const signature = (await headers()).get('stripe-signature');
  if (!stripe || !signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json({ error: `Invalid signature: ${error instanceof Error ? error.message : 'unknown error'}` }, { status: 400 });
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid' && session.metadata?.fulfillment_status !== 'fulfilled') {
      try {
        const metadata = session.metadata || {};
        const shipping = session.collected_information?.shipping_details?.address;
        const name = session.collected_information?.shipping_details?.name || session.customer_details?.name || '';
        if (!shipping || !metadata.fit || !metadata.size) throw new Error('Missing shipping or product metadata.');
        const result = await createScalablePressOrder({
          fit: metadata.fit as 'fitted' | 'unisex',
          size: metadata.size as 'S' | 'M' | 'L' | 'XL',
          timestamp: metadata.timestamp_utc || new Date().toISOString(),
          address: { name, address1: shipping.line1 || '', address2: shipping.line2 || '', city: shipping.city || '', state: shipping.state || '', zip: shipping.postal_code || '', country: shipping.country || '', email: session.customer_details?.email || '' },
        });
        await stripe.checkout.sessions.update(session.id, { metadata: { ...metadata, fulfillment_status: 'fulfilled', scalable_press_order_id: result.orderId || '', scalable_press_design_id: result.designId } });
        console.log('Fulfilled datetime tee', { session: session.id, ...result });
      } catch (error) {
        console.error('fulfillment error', { session: session.id, error });
        return NextResponse.json({ error: 'Fulfillment failed; Stripe will retry this webhook.' }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
