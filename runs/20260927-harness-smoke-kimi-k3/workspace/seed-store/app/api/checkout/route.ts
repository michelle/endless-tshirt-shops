import { getStripe } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/base-url';
import { validateOrderInput } from '@/lib/order-input';
import { artworkUrlFor } from '@/lib/prodigi';
import {
  CURRENCY,
  getGarment,
  getPalette,
  PRICE_CENTS,
  SHIPPING_COUNTRIES,
} from '@/lib/catalogue';

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = validateOrderInput(raw);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  const { input } = result;

  const palette = getPalette(input.paletteId)!;
  const garment = getGarment(input.garmentColor)!;
  const base = getBaseUrl();

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `SEED one-of-one tee — “${input.word}”`,
              description: `Artwork grown from your word · ${palette.name} palette · ${garment.label} shirt · size ${input.size.toUpperCase()}`,
              images: [artworkUrlFor(input)],
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [...SHIPPING_COUNTRIES],
      },
      phone_number_collection: { enabled: true },
      metadata: {
        word: input.word,
        paletteId: input.paletteId,
        garmentColor: input.garmentColor,
        size: input.size,
      },
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/create?word=${encodeURIComponent(input.word)}&palette=${encodeURIComponent(input.paletteId)}&garment=${encodeURIComponent(input.garmentColor)}&size=${encodeURIComponent(input.size)}`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('checkout session failed', err);
    return Response.json(
      { error: 'Could not start checkout. Please try again.' },
      { status: 502 },
    );
  }
}
