import Stripe from 'stripe';

const ALLOWED_FITS = new Set(['fitted', 'classic']);
const ALLOWED_SIZES = new Set(['S', 'M', 'L', 'XL']);

function siteOrigin(req) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, '');
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  return `${forwardedProto}://${forwardedHost}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Payments are not configured yet.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const timestamp = new Date(body.timestamp);
    const fit = body.fit;
    const size = body.size;
    if (Number.isNaN(timestamp.getTime()) || !ALLOWED_FITS.has(fit) || !ALLOWED_SIZES.has(size)) {
      return res.status(400).json({ error: 'Please choose a valid timestamp, cut, and size.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = siteOrigin(req);
    const artworkUrl = `${origin}/api/artwork?timestamp=${encodeURIComponent(timestamp.toISOString())}&fit=${fit}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 2250,
          product_data: {
            name: 'datetime.store timestamp tee',
            description: `${fit === 'fitted' ? 'Fitted' : 'Classic'} black tee · size ${size}`,
          },
        },
      }],
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'] },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: 'usd' },
          display_name: 'Free standard shipping',
          delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } },
        },
      }],
      customer_creation: 'always',
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: {
        timestamp: timestamp.toISOString(),
        fit,
        size,
        artworkUrl,
        productSku: 'GLOBAL-TEE-BC-3001',
      },
    });
    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('checkout_session_error', error);
    return res.status(500).json({ error: 'We could not open checkout. Please try again.' });
  }
}
