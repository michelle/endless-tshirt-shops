import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { encodeParams } from '@/lib/design-token';
import { BASE_PRICE_CENTS, CURRENCY, getPalette, getShirt, getSize, getStyle, STYLES } from '@/lib/theme';
import { originFromRequest } from '@/lib/origin';

export const runtime = 'nodejs';

const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT',
  'SE', 'NO', 'DK', 'FI', 'CH', 'PL', 'CZ', 'GR', 'JP', 'KR', 'SG', 'HK', 'IN', 'BR',
  'MX', 'AE',
] as const;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Please enter the name for your design.' }, { status: 400 });
    }

    const size = getSize(String(body.size || 'l'));
    const params = {
      name,
      word: String(body.word || ''),
      palette: String(body.palette || 'aurora'),
      style: String(body.style || 'topo'),
      shirt: String(body.shirt || 'black'),
    };
    const palette = getPalette(params.palette);
    const styleId = getStyle(params.style);
    const styleName = STYLES.find((s) => s.id === styleId)?.name || 'Aura';
    const shirt = getShirt(params.shirt);

    const token = encodeParams(params);
    const priceCents = BASE_PRICE_CENTS + size.surcharge;
    const origin = originFromRequest(req);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: priceCents,
            product_data: {
              name: `RESONA One-of-One Tee — “${params.name}”`,
              description: `${palette.name} · ${styleName} · ${shirt.name} · Size ${size.name}`,
              images: [`${origin}/api/mockup?t=${encodeURIComponent(token)}&w=480`],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...ALLOWED_COUNTRIES] },
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1#create`,
      metadata: {
        design: token,
        size: size.id,
        name: params.name.slice(0, 60),
      },
    });

    return NextResponse.json({ url: session.url, id: session.id, token });
  } catch (err) {
    console.error('checkout error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Checkout failed.' }, { status: 500 });
  }
}
