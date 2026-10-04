import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createProdigiOrder } from '@/lib/prodigi';
import { saveOrder } from '@/lib/orderStore';
import { DesignParams, ShippingAddress, OrderRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { designParams, shippingAddress } = body as {
      designParams: DesignParams;
      shippingAddress?: Partial<ShippingAddress>;
    };

    if (!designParams) {
      return NextResponse.json(
        { error: 'Missing designParams.' },
        { status: 400 }
      );
    }

    const recipient: ShippingAddress = {
      name: shippingAddress?.name || 'Aethel Evaluator',
      email: shippingAddress?.email || 'evaluator@example.com',
      line1: shippingAddress?.line1 || '500 Howard Street',
      line2: shippingAddress?.line2 || undefined,
      city: shippingAddress?.city || 'San Francisco',
      state: shippingAddress?.state || 'CA',
      postalCode: shippingAddress?.postalCode || '94105',
      country: (shippingAddress?.country || 'US').toUpperCase()
    };

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const encodedDesignId =
      'd_' + Buffer.from(JSON.stringify(designParams)).toString('base64url');

    // 1. Process payment via Stripe PaymentIntent with Stripe test card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3600, // $36.00 USD
      currency: 'usd',
      payment_method: 'pm_card_visa',
      confirm: true,
      return_url: `${origin}/order-success`,
      description: `Aethel Bespoke Tee: ${designParams.title} (${designParams.city})`,
      metadata: {
        designId: encodedDesignId,
        color: designParams.color,
        size: designParams.size,
        title: designParams.title,
        city: designParams.city
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment failed with status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // 2. Only after payment succeeds, construct public asset URL and call Prodigi
    const assetUrl = `${origin}/api/design/${encodedDesignId}.png`;
    const orderRef = `aethel_test_${paymentIntent.id.substring(paymentIntent.id.length - 8)}`;

    const prodigiRes = await createProdigiOrder({
      orderReference: orderRef,
      recipient,
      garmentColor: designParams.color,
      size: designParams.size,
      assetUrl
    });

    const prodigiOrder = prodigiRes.order;

    const orderRecord: OrderRecord = {
      id: `ord_${paymentIntent.id}`,
      createdAt: new Date().toISOString(),
      stripePaymentIntentId: paymentIntent.id,
      prodigiOrderId: prodigiOrder.id,
      status: 'prodigi_submitted',
      designParams,
      shippingAddress: recipient,
      amount: 3600,
      currency: 'usd',
      prodigiStatus: prodigiOrder
    };

    saveOrder(orderRecord);

    return NextResponse.json({
      success: true,
      message: 'Payment succeeded via Stripe and order dispatched to Prodigi Print API.',
      stripePaymentId: paymentIntent.id,
      prodigiOrderId: prodigiOrder.id,
      prodigiStatus: prodigiOrder.status,
      assetUrl,
      order: orderRecord
    });
  } catch (error: any) {
    console.error('Test order processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete test order pipeline' },
      { status: 500 }
    );
  }
}
