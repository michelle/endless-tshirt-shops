const Stripe = require('stripe');
const { cleanDesignParams } = require('../lib/params');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_USD = 3800; // $38.00, free shipping
const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl'];
const COLORS = ['black', 'navy blue', 'charcoal'];
const COUNTRIES = ['US','CA','GB','IE','FR','DE','NL','BE','ES','IT','PT','AT','CH','SE','NO','DK','FI','AU','NZ','JP','SG','PL','CZ'];

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

// POST /api/checkout { when, lat, lon, place, caption, size, color }
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  try {
    const body = JSON.parse(await readBody(req));
    const design = cleanDesignParams(body);
    const size = String(body.size || '').toLowerCase();
    const color = String(body.color || '').toLowerCase();
    if (!SIZES.includes(size)) throw new Error('invalid size');
    if (!COLORS.includes(color)) throw new Error('invalid color');

    const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const productName = `Under This Sky — custom star map tee (${color}, ${size.toUpperCase()})`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_USD,
          product_data: {
            name: productName,
            description: `${design.caption ? `"${design.caption}" — ` : ''}${design.place}, ${design.when.slice(0, 10)}`,
          },
        },
        quantity: 1,
      }],
      shipping_address_collection: { allowed_countries: COUNTRIES },
      phone_number_collection: { enabled: true },
      metadata: { ...design, size, color },
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/`,
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
