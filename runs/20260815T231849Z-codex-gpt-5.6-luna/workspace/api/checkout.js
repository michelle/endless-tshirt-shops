import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_AUTH);
const products = { fitted: 'next-level-boyfriend-tee', unisex: 'next-level-fitted-crew' };
const sizes = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { fit = 'fitted', size = 'M', timestamp = '' } = req.body || {};
  if (!products[fit] || !sizes[size]) return res.status(400).json({ error: 'Please choose a valid style and size.' });
  const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: 'usd', unit_amount: 2250, product_data: { name: 'datetime.store tee', description: `${fit} · ${size} · printed ${timestamp}` } }, quantity: 1 }],
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'usd' }, display_name: 'Standard shipping', delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 7 } } } }],
      allow_promotion_codes: true,
      metadata: { fit, size, timestamp, product: products[fit] },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`
    });
    return res.status(200).json({ url: session.url });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Checkout is temporarily unavailable.' }); }
}
