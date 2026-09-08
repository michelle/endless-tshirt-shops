import Stripe from 'stripe';

const PRODUCT_PRICE = 4400;
const VALID_BADGES = new Set(['orbit', 'spark', 'moon', 'wave']);
const VALID_SIZES = new Set(['S', 'M', 'L', 'XL', '2XL', '3XL']);

function json(res: any, status: number, body: Record<string, unknown>) { res.status(status).setHeader('Content-Type', 'application/json').json(body); }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  if (!process.env.STRIPE_SECRET_KEY) return json(res, 503, { error: 'Payments are not connected yet. Add STRIPE_SECRET_KEY to enable checkout.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    const name = String(body.name ?? '').trim().slice(0, 22);
    const phrase = String(body.phrase ?? '').trim().slice(0, 42);
    const badge = String(body.badge ?? 'orbit');
    const size = String(body.size ?? 'M');
    const quantity = Math.min(5, Math.max(1, Number(body.quantity) || 1));
    if (!phrase || !VALID_BADGES.has(badge) || !VALID_SIZES.has(size)) return json(res, 400, { error: 'Please add a phrase and choose a valid badge and size.' });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = process.env.PUBLIC_SITE_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity, price_data: { currency: 'usd', unit_amount: PRODUCT_PRICE, product_data: { name: `Make It Yours / ${phrase}`, description: `Black AS Colour 5001 tee · ${size} · ${name || 'custom word'} · ${badge} mark` } } }],
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'] },
      phone_number_collection: { enabled: true },
      metadata: { name, phrase, badge, size, quantity: String(quantity), sku: 'TEE-AS-5001' },
      success_url: `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
    });
    return json(res, 200, { url: session.url });
  } catch (error) { console.error('checkout_error', error); return json(res, 500, { error: 'Checkout could not be started. Please try again.' }); }
}
