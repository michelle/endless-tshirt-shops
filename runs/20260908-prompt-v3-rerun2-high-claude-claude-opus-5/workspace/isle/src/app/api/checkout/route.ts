import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
  PRODUCT,
  SHIPPING,
  SHIP_TO,
  describe,
  parseSpec,
  siteUrl,
  specErrors,
  specToMetadata,
  type ShippingKey,
} from '@/lib/spec';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const spec = parseSpec(body?.spec);
  const problems = specErrors(spec);
  if (problems.length) {
    return NextResponse.json(
      { error: `The survey is incomplete: ${problems.join(', ')}.` },
      { status: 400 }
    );
  }

  const quantity = Math.min(PRODUCT.maxQty, Math.max(1, Math.floor(Number(body?.quantity) || 1)));
  const origin = siteUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.unitAmount,
          product_data: {
            name: describe(spec),
            description: `${PRODUCT.blurb}. Engraved to order, printed direct-to-garment.`,
          },
        },
      },
    ],
    // Everything needed to re-engrave and fulfil the order lives here, so the
    // webhook can build the Prodigi order from the session alone.
    metadata: { ...specToMetadata(spec), quantity: String(quantity) },
    shipping_address_collection: { allowed_countries: [...SHIP_TO] },
    phone_number_collection: { enabled: true },
    billing_address_collection: 'auto',
    shipping_options: (Object.keys(SHIPPING) as ShippingKey[]).map((k) => ({
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: SHIPPING[k].label,
        fixed_amount: { amount: SHIPPING[k].amount, currency: PRODUCT.currency },
        metadata: { shipping_key: k },
      },
    })),
    success_url: `${origin}/order?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?cancelled=1`,
  });

  return NextResponse.json({ url: session.url });
}
