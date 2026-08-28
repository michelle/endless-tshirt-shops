import Stripe from 'stripe';

export const runtime = 'nodejs';
const PRICE_CENTS = 2900;
const allowedSizes = new Set(['S', 'M', 'L', 'XL', '2XL']);

function origin(request) {
  return process.env.APP_URL || new URL(request.url).origin;
}

export async function POST(request) {
  try {
    const { stamp, size, fit } = await request.json();
    if (!/^\d{13}$/.test(String(stamp)) || !allowedSizes.has(size) || !['unisex', 'fitted'].includes(fit)) {
      return Response.json({ error: 'Please choose a valid shirt option.' }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe test keys have not been configured yet. Add STRIPE_SECRET_KEY to enable checkout.' }, { status: 503 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const base = origin(request);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'US standard shipping', delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 7 } } } }],
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      line_items: [{ price_data: { currency: 'usd', unit_amount: PRICE_CENTS, product_data: { name: 'A t-shirt from this exact moment', description: `Frozen timestamp: ${stamp}`, images: [`${base}/api/artwork?stamp=${encodeURIComponent(stamp)}`] }, }, quantity: 1 }],
      metadata: { stamp: String(stamp), size, fit, sku: fit === 'fitted' ? 'GLOBAL-TEE-BC-6004' : 'GLOBAL-TEE-BC-3001' },
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?cancelled=1`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('checkout_create_failed', error);
    return Response.json({ error: 'Unable to start checkout. Please try again.' }, { status: 500 });
  }
}
