import { NextResponse } from 'next/server';
import { stripe, isStripeConfigured, siteOrigin } from '@/lib/stripe';
import { chunkForMetadata, encodeCart, sanitizeCart } from '@/lib/cart';
import { SHIP_COUNTRIES, SIZE_LABEL, getColor, getDesign, unitPriceCents } from '@/lib/catalog';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Checkout is not configured (STRIPE_SECRET_KEY missing).' }, { status: 503 });
  }

  let payload: unknown;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const lines = sanitizeCart((payload as { items?: unknown })?.items);
  if (lines.length === 0) return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });

  const origin = siteOrigin(req);

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: lines.map((l) => {
        const d = getDesign(l.slug)!;
        const c = getColor(l.color)!;
        return {
          quantity: l.qty,
          price_data: {
            currency: 'usd',
            unit_amount: unitPriceCents(l.size),
            product_data: {
              name: `${d.trade} — Last Shift tee`,
              description: `${c.name} · ${SIZE_LABEL[l.size]} · unisex heavyweight cotton`,
              images: [`${origin}/art/${l.slug}-${c.ink}.png`],
              metadata: { slug: l.slug, color: l.color, size: l.size },
            },
          },
        };
      }),
      shipping_address_collection: { allowed_countries: SHIP_COUNTRIES as unknown as any },
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      metadata: { store: 'last-shift', ...chunkForMetadata(encodeCart(lines)) },
      success_url: `${origin}/order?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?cancelled=1`,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not start checkout.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
