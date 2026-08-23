import Stripe from 'stripe';

const styles = new Set(['fitted', 'unisex']);
const sizes = new Set(['S', 'M', 'L', 'XL']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Checkout is not configured yet.' });
  const { style, size, timestamp } = req.body || {};
  if (!styles.has(style) || !sizes.has(size) || !/^\d{13}$/.test(String(timestamp))) return res.status(400).json({ error: 'Choose a valid shirt style and size.' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_creation: 'always',
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Free US shipping', delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } } } }],
      line_items: [{ price_data: { currency: 'usd', unit_amount: 2250, product_data: { name: 'Datetime shirt', description: `${style === 'fitted' ? 'Fitted' : 'Unisex'} · ${size} · timestamp ${timestamp}` }, }, quantity: 1 }],
      metadata: { product: 'datetime-shirt', style, size, timestamp: String(timestamp) },
      payment_intent_data: { metadata: { product: 'datetime-shirt', style, size, timestamp: String(timestamp), fulfillment_status: 'pending' } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout creation failed', error);
    return res.status(500).json({ error: 'Could not start secure checkout.' });
  }
}
