import Stripe from 'stripe';

const validCuts = new Set(['fitted', 'unisex']);
const validSizes = new Set(['S', 'M', 'L', 'XL']);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Payments are not configured yet.' });
  const { cut, size, timestamp } = req.body || {};
  if (!validCuts.has(cut) || !validSizes.has(size) || !/^\d{12,15}$/.test(String(timestamp))) return res.status(400).json({ error: 'Please choose a valid shirt configuration.' });
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: ['US'] },
      customer_creation: 'always',
      allow_promotion_codes: false,
      line_items: [{ price_data: { currency: 'usd', unit_amount: 2250, product_data: { name: 'datetime.store t-shirt', description: `${cut === 'fitted' ? 'Fitted' : 'Unisex'} · Black · ${size} · timestamp ${timestamp}` }, }, quantity: 1 }],
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Free standard shipping', delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 7 } } } }],
      metadata: { cut, size, timestamp: String(timestamp), shop: 'datetime.store' },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });
    return res.status(200).json({ url: session.url });
  } catch (error) { return res.status(500).json({ error: 'Stripe could not create a checkout session.' }); }
}
