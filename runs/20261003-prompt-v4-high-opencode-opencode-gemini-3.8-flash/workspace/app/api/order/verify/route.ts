import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createProdigiOrder, getProdigiOrder } from '@/lib/prodigi';
import { getOrder, saveOrder } from '@/lib/orderStore';
import { DesignParams, ShippingAddress, OrderRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter.' },
        { status: 400 }
      );
    }

    // 1. Verify payment with Stripe API
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        {
          error: `Payment is not marked as paid. Status: ${session.payment_status}`,
          paymentStatus: session.payment_status
        },
        { status: 400 }
      );
    }

    // Check if order was already submitted to Prodigi
    const existingOrder = getOrder(sessionId);
    if (existingOrder?.prodigiOrderId) {
      // Refresh status from Prodigi
      try {
        const prodigiData = await getProdigiOrder(existingOrder.prodigiOrderId);
        existingOrder.prodigiStatus = prodigiData.order;
        saveOrder(existingOrder);
      } catch (e) {
        // Keep existing status
      }
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        order: existingOrder
      });
    }

    // 2. Decode design params from metadata
    const designId = session.metadata?.designId || '';
    let designParams: DesignParams;

    if (designId.startsWith('d_')) {
      const jsonStr = Buffer.from(designId.substring(2), 'base64url').toString('utf8');
      designParams = JSON.parse(jsonStr);
    } else if (existingOrder?.designParams) {
      designParams = existingOrder.designParams;
    } else {
      throw new Error('Unable to recover design parameters for session ' + sessionId);
    }

    // 3. Extract shipping address from Stripe session
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

    // 4. Construct public asset URL for Prodigi to download
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const assetUrl = `${proto}://${host}/api/design/${designId}.png`;

    // 5. Submit order to Prodigi Print API (ONLY AFTER PAYMENT SUCCEEDS)
    const prodigiRes = await createProdigiOrder({
      orderReference: `aethel_${sessionId.substring(sessionId.length - 12)}`,
      recipient: shippingAddress,
      garmentColor: designParams.color,
      size: designParams.size,
      assetUrl
    });

    const prodigiOrder = prodigiRes.order;

    // 6. Record order
    const orderRecord: OrderRecord = {
      id: `ord_${sessionId}`,
      createdAt: new Date().toISOString(),
      stripeSessionId: sessionId,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      prodigiOrderId: prodigiOrder.id,
      status: 'prodigi_submitted',
      designParams,
      shippingAddress,
      amount: session.amount_total || 3600,
      currency: session.currency || 'usd',
      prodigiStatus: prodigiOrder
    };

    saveOrder(orderRecord);

    return NextResponse.json({
      success: true,
      order: orderRecord
    });
  } catch (error: any) {
    console.error('Order verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification and fulfillment failed' },
      { status: 500 }
    );
  }
}
