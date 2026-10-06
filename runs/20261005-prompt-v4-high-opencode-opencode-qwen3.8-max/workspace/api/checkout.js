// POST /api/checkout — creates a Stripe Checkout Session for the design.
// The design spec and this deployment's URL travel in session metadata so the
// webhook can fulfil the order without any database.
import { readBody, json, cors, fail } from '../lib/http.mjs';
import { normalizeSpec, totals } from '../lib/spec.mjs';
import { stripe } from '../lib/stripe.mjs';

const COUNTRIES = ['US', 'CA', 'GB', 'IE', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'AT', 'CH', 'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'SI', 'EE', 'LV', 'LT', 'LU', 'MT', 'CY', 'AU', 'NZ'];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST') return fail(res, 405, 'POST only');
  try {
    const raw = typeof req.body === 'string' ? req.body : await readBody(req);
    const spec = normalizeSpec(JSON.parse(raw || '{}'));
    const { total } = totals(spec, process.env);
    const origin = process.env.PUBLIC_BASE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    const form = {
      mode: 'payment',
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
      'line_items[0][quantity]': String(spec.qty),
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': `Heliogram — ${spec.city} year-of-light tee`,
      'line_items[0][price_data][product_data][description]': 'One-of-one direct-to-garment print of the solar year at your coordinates.',
      'line_items[0][price_data][unit_amount]': String(total),
      'phone_number_collection[enabled]': 'true',
      'metadata[spec]': JSON.stringify(spec),
      'metadata[base_url]': origin,
    };
    COUNTRIES.forEach((c, i) => { form[`shipping_address_collection[allowed_countries][${i}]`] = c; });

    const session = await stripe.createCheckoutSession(form);
    json(res, 200, { url: session.url, sessionId: session.id, totalCents: total });
  } catch (e) {
    fail(res, e.stripe ? 402 : 400, e.message);
  }
}
