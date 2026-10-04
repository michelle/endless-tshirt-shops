import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { DesignParams } from '@/lib/types';
import { saveOrder } from '@/lib/orderStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { designParams, quantity = 1 } = body as {
      designParams: DesignParams;
      quantity?: number;
    };

    if (!designParams) {
      return NextResponse.json(
        { error: 'Missing designParams in request.' },
        { status: 400 }
      );
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    const encodedDesignId =
      'd_' + Buffer.from(JSON.stringify(designParams)).toString('base64url');

    const formattedDate = new Date(designParams.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: [
          'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE',
          'NO', 'DK', 'NZ', 'JP', 'SG', 'IE', 'CH', 'AT', 'BE', 'FI'
        ]
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Aethel Celestial Tee: "${designParams.title || 'Under This Sky'}"`,
              description: `Custom DTG 100% Combed Ringspun Cotton (Bella + Canvas 3001) | Color: ${designParams.color.toUpperCase()} | Size: ${designParams.size.toUpperCase()} | Sky: ${designParams.city} (${formattedDate})`,
              images: [`${origin}/api/design/${encodedDesignId}.png?w=800`]
            },
            unit_amount: 3600 // $36.00 USD
          },
          quantity: Math.max(1, quantity)
        }
      ],
      metadata: {
        designId: encodedDesignId,
        color: designParams.color,
        size: designParams.size,
        title: designParams.title,
        city: designParams.city,
        date: designParams.date
      },
      success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`
    });

    // Track order record as pending
    saveOrder({
      id: `ord_${session.id}`,
      createdAt: new Date().toISOString(),
      stripeSessionId: session.id,
      status: 'pending_payment',
      designParams,
      amount: 3600 * quantity,
      currency: 'usd'
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize checkout session' },
      { status: 500 }
    );
  }
}
