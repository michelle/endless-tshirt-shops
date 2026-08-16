import Stripe from 'stripe';
export const runtime = 'nodejs';
const allowedStyles = new Set(['fitted', 'unisex']);
const allowedSizes = new Set(['S', 'M', 'L', 'XL']);
export async function POST(request) {
  try {
    const { style, size, email } = await request.json();
    if (!allowedStyles.has(style) || !allowedSizes.has(size) || !/^\S+@\S+\.\S+$/.test(email || '')) return Response.json({ error: 'Please choose a fit, size, and valid email.' }, { status: 400 });
    if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Checkout is not configured yet. Please try again later.' }, { status: 503 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = request.headers.get('origin') || process.env.PUBLIC_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({ mode: 'payment', customer_email: email, billing_address_collection: 'required', shipping_address_collection: { allowed_countries: ['US'] }, phone_number_collection: { enabled: true }, success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/?cancelled=1`, metadata: { style, size, captured_at: String(Date.now()) }, line_items: [{ price_data: { currency: 'usd', unit_amount: 2250, product_data: { name: 'The Current Datetime T-Shirt', description: `${style === 'fitted' ? 'Fitted' : 'Unisex'} · ${size} · Black` }, }, quantity: 1 }] });
    return Response.json({ url: session.url });
  } catch (err) { console.error('Checkout failed', err.message); return Response.json({ error: 'Unable to start secure checkout. Please try again.' }, { status: 500 }); }
}
