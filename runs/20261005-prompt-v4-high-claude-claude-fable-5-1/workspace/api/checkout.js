// POST /api/checkout  { spec, quantity }  ->  { url }  (Stripe Checkout, hosted page)
import { stripe, PRICE_CENTS, SHIPPING_CENTS, CURRENCY, SHIP_COUNTRIES } from '../lib/stripe.js';
import { validateSpec, specToMetadata, artUrl, encodeSpec } from '../lib/spec.js';
import { fetchDay } from '../lib/weather.js';
import { summarize, SHIRTS } from '../public/lib/dayprint.js';
import { readJson, json, error, baseUrl, methodNotAllowed } from '../lib/http.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');
  let body;
  try { body = await readJson(req); } catch (e) { return error(res, 400, e.message); }
  let spec;
  try { spec = validateSpec(body.spec); } catch (e) { return error(res, 400, e.message); }
  const quantity = Math.max(1, Math.min(5, Math.round(Number(body.quantity) || 1)));
  const base = baseUrl(req);

  // Make sure the day actually renders before taking money.
  let day;
  try {
    day = await fetchDay({ lat: spec.place.lat, lon: spec.place.lon, date: spec.date, unit: spec.unit, place: spec.place });
  } catch (e) {
    return error(res, 400, 'We could not find weather for that day and place. ' + e.message);
  }

  const placeLabel = [spec.place.name, spec.place.admin1 || spec.place.country].filter(Boolean).join(', ');
  const niceDate = new Date(spec.date + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const shirt = SHIRTS[spec.shirt];

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS(),
          product_data: {
            name: `Dayprint — ${placeLabel}, ${niceDate}`,
            description: `${shirt.label} tee, size ${spec.size.toUpperCase()}${spec.caption ? ` · “${spec.caption}”` : ''} · ${summarize(day)}`,
            images: [artUrl(base, spec, { width: 800 })],
          },
        },
      }],
      shipping_address_collection: { allowed_countries: SHIP_COUNTRIES },
      phone_number_collection: { enabled: true },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: SHIPPING_CENTS(), currency: CURRENCY },
          display_name: 'Standard shipping',
          delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 10 } },
        },
      }],
      custom_text: {
        shipping_address: { message: 'Each Dayprint is printed to order on a Bella + Canvas 3001 tee and ships from the print facility nearest you.' },
        submit: { message: 'Your shirt goes to print the moment payment clears.' },
      },
      metadata: { ...specToMetadata(spec), base_url: base, quantity: String(quantity) },
      payment_intent_data: { metadata: { ...specToMetadata(spec), base_url: base }, description: `Dayprint ${placeLabel} ${spec.date}` },
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?resume=${encodeSpec(spec)}`,
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
    });
    json(res, 200, { url: session.url, id: session.id });
  } catch (e) {
    console.error('checkout error', e);
    error(res, 502, 'Could not start checkout: ' + (e.message || 'unknown error'));
  }
}
