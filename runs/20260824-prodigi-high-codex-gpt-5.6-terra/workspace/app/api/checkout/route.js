import Stripe from 'stripe';

export const runtime = 'nodejs';
const styles = { fitted: 'Fitted / Women’s Softstyle', unisex: 'Unisex / Bella + Canvas V-neck' };
const sizes = new Set(['S', 'M', 'L', 'XL', '2XL']);

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Checkout is not configured yet.' }, { status: 503 });
    const { style, size, timestamp } = await request.json();
    if (!styles[style] || !sizes.has(size) || !/^\d{13}$/.test(timestamp || '')) return Response.json({ error: 'Invalid shirt configuration.' }, { status: 400 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = process.env.PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      customer_creation: 'always',
      metadata: { timestamp, style, size, fulfillment: 'prodigi' },
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: 2250, product_data: { name: 'The Current Datetime T-shirt', description: `${styles[style]} · ${size} · printed with ${timestamp}`, metadata: { timestamp, style, size } } } }],
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('checkout_session_error', error.message);
    return Response.json({ error: 'Could not start Stripe Checkout. Please try again.' }, { status: 500 });
  }
}
