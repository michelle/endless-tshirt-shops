import { NextResponse } from 'next/server';
import { SHIPPING_COUNTRIES, appUrl, stripe } from '@/lib/stripe';
import {
  designParamsSchema,
  productSchema,
  PRICE_SHIPPING_CENTS,
  PRICE_SHIRT_CENTS,
  PRICE_TOTAL_CENTS,
  validateProduct,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_DATE = '1900-01-01';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const raw = body as { design?: unknown; product?: unknown };

  const parsedDesign = designParamsSchema.safeParse(raw.design);
  if (!parsedDesign.success) {
    return NextResponse.json(
      { error: 'invalid design', details: parsedDesign.error.flatten() },
      { status: 400 }
    );
  }
  const parsedProduct = productSchema.safeParse(raw.product);
  if (!parsedProduct.success) {
    return NextResponse.json({ error: 'invalid product' }, { status: 400 });
  }
  const design = parsedDesign.data;
  const product = parsedProduct.data;
  try {
    validateProduct(product);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (design.date < MIN_DATE || design.date > new Date().toISOString().slice(0, 10)) {
    return NextResponse.json(
      { error: 'birth date must be between 1900 and today' },
      { status: 400 }
    );
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: PRICE_SHIRT_CENTS + PRICE_SHIPPING_CENTS,
            product_data: {
              name: `Starryborn sky chart tee — ${design.name}`,
              description: `${design.date} · ${design.place} · ${product.color} / ${product.size}`,
            },
          },
        },
      ],
      // Shipping is collected by Stripe Checkout and handed to Prodigi.
      shipping_address_collection: {
        allowed_countries: SHIPPING_COUNTRIES,
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: 'Standard shipping',
            fixed_amount: { amount: 0, currency: 'usd' },
            // Shipping is already priced into the line item above
            // (shirt + shipping = one transparent total).
          },
        },
      ],
      metadata: {
        store: 'starryborn',
        design: JSON.stringify(design),
        product: JSON.stringify(product),
        // Human-readable convenience for the dashboard:
        shirt: `${product.color}/${product.size}`,
        totalCents: String(PRICE_TOTAL_CENTS),
        shirtCents: String(PRICE_SHIRT_CENTS),
        shippingCents: String(PRICE_SHIPPING_CENTS),
      },
      success_url: `${appUrl()}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/?cancelled=1`,
    });
    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
    }
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('checkout creation failed', e);
    return NextResponse.json(
      { error: `could not start checkout: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
