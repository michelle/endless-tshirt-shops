import Stripe from 'stripe';
import { INKS, PRICE_CENTS, SHIPPING_CENTS, SHIRTS, validateCustomization } from '@/lib/catalog';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const result = validateCustomization(body);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const { text, style, ink, shirt, size } = result.value;

  const origin = new URL(req.url).origin;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `MANTRA One-of-One Tee — "${text}"`,
              description: `Style: ${style} · Ink: ${INKS[ink].label} · Shirt: ${SHIRTS[shirt].label} · Size: ${size.toUpperCase()}`,
            },
          },
        },
      ],
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: SHIPPING_CENTS, currency: 'usd' },
            display_name: 'Standard (5–8 business days)',
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [
          'US', 'CA', 'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE',
          'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'AU', 'NZ', 'JP',
        ],
      },
      metadata: { text, style, ink, shirt, size },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('checkout session create failed', err);
    return Response.json({ error: 'Could not create checkout session' }, { status: 500 });
  }
}
