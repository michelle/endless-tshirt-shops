import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createProdigiOrder } from '@/lib/prodigi';
import { getOrder, saveOrder } from '@/lib/orderStore';
import { DesignParams, ShippingAddress, OrderRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;
    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.warn('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    } else {
      // In sandbox/preview mode without configured webhook secret, parse payload directly
      try {
        event = JSON.parse(rawBody);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (session.payment_status === 'paid') {
        const existingOrder = getOrder(session.id);
        if (!existingOrder?.prodigiOrderId) {
          const designId = session.metadata?.designId;
          if (designId && designId.startsWith('d_')) {
            const jsonStr = Buffer.from(designId.substring(2), 'base64url').toString('utf8');
            const designParams: DesignParams = JSON.parse(jsonStr);

            const shippingDetails = (session as any).shipping_details || session.customer_details;
            const addr = shippingDetails?.address;

            const shippingAddress: ShippingAddress = {
              name: shippingDetails?.name || 'Valued Customer',
              email: session.customer_details?.email || 'customer@example.com',
              line1: addr?.line1 || '1 Main St',
              line2: addr?.line2 || undefined,
              city: addr?.city || 'San Francisco',
              state: addr?.state || 'CA',
              postalCode: addr?.postal_code || '94105',
              country: addr?.country || 'US'
            };

            const host = req.headers.get('host') || 'localhost:3000';
            const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
            const assetUrl = `${proto}://${host}/api/design/${designId}.png`;

            const prodigiRes = await createProdigiOrder({
              orderReference: `aethel_${session.id.substring(session.id.length - 12)}`,
              recipient: shippingAddress,
              garmentColor: designParams.color,
              size: designParams.size,
              assetUrl
            });

            const orderRecord: OrderRecord = {
              id: `ord_${session.id}`,
              createdAt: new Date().toISOString(),
              stripeSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
              prodigiOrderId: prodigiRes.order.id,
              status: 'prodigi_submitted',
              designParams,
              shippingAddress,
              amount: session.amount_total || 3600,
              currency: session.currency || 'usd',
              prodigiStatus: prodigiRes.order
            };

            saveOrder(orderRecord);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
