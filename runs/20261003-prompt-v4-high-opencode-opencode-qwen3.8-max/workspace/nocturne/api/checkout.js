// POST /api/checkout — create a Stripe Checkout Session for a validated design.
// Body: { ...designFields, size, qty }
// Returns { url, sessionId }. Nothing is sent to Prodigi until the webhook confirms payment.
const Stripe = require('stripe');
const { normalizeDesign, SIZES, PRICE_USD, SHIPPING_USD } = require('../lib/design');
const { THEMES } = require('../lib/render');
const cfg = require('../lib/server');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return cfg.json(res, 405, { error: 'POST only' });
  if (!cfg.STRIPE_SECRET) return cfg.json(res, 500, { error: 'payments are not configured on this deployment' });

  let raw;
  try {
    raw = JSON.parse(await cfg.readBody(req));
  } catch {
    return cfg.json(res, 400, { error: 'invalid JSON body' });
  }

  const { design, token, errors } = normalizeDesign(raw);
  if (errors.length) return cfg.json(res, 422, { errors });

  const size = String(raw.size || '').toLowerCase();
  if (!SIZES.includes(size)) return cfg.json(res, 422, { errors: ['Choose a size.'] });
  const qty = Math.min(5, Math.max(1, parseInt(raw.qty, 10) || 1));

  const spec64 = Buffer.from(JSON.stringify(design)).toString('base64url');
  const theme = THEMES[design.theme];

  const stripe = new Stripe(cfg.STRIPE_SECRET);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: raw.email || undefined,
    client_reference_id: token,
    shipping_address_collection: { allowed_countries: cfg.SHIP_COUNTRIES },
    billing_address_collection: 'auto',
    line_items: [
      {
        quantity: qty,
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_USD * 100,
          product_data: {
            name: `NOCTURNE sky chart tee — “${design.title}”`,
            description: `${theme.shirt} Bella+Canvas 3001, size ${size.toUpperCase()}, custom night-sky print`,
            metadata: { token, size },
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(SHIPPING_USD * 100),
          product_data: { name: 'Standard shipping (tracked, print-on-demand)' },
        },
      },
    ],
    metadata: { token, s: spec64, size, qty: String(qty) },
    success_url: `${cfg.APP_URL}/?placed={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cfg.APP_URL}/?cancelled=1`,
  });

  return cfg.json(res, 200, { url: session.url, sessionId: session.id, token });
};
