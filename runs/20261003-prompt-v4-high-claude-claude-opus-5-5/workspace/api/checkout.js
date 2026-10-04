import { waitUntil } from '@vercel/functions';
import { getStripe, PRODUCT, COUNTRIES, SHIPPING, baseUrl, json } from '../lib/config.js';
import { reconcile } from '../lib/reconcile.js';
import { normalizeDesign, packDesign, DesignError, GARMENTS, SIZES } from '../public/js/design.js';

export async function POST(request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  let design;
  try {
    design = normalizeDesign(input.design);
  } catch (e) {
    return json({ error: e instanceof DesignError ? e.message : 'Invalid design.' }, 400);
  }
  const garmentKey = GARMENTS[input.garment] ? input.garment : null;
  if (!garmentKey) return json({ error: 'Pick a shirt colour.' }, 400);
  const sizes = SIZES.map((size) => ({ size, qty: Math.max(0, Math.min(PRODUCT.maxQty, parseInt(input.sizes?.[size], 10) || 0)) })).filter((s) => s.qty);
  const qty = sizes.reduce((n, s) => n + s.qty, 0);
  if (!qty) return json({ error: 'Choose at least one size.' }, 400);
  if (qty > PRODUCT.maxQty) return json({ error: `Max ${PRODUCT.maxQty} shirts per order.` }, 400);

  const garment = GARMENTS[garmentKey];
  const base = baseUrl(request);
  const metadata = {
    kind: 'transit-tee',
    garment: garmentKey,
    sizes: sizes.map((s) => `${s.size}:${s.qty}`).join(','),
    ...packDesign(design),
  };
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: sizes.map(({ size, qty: quantity }) => ({
        quantity,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.unitAmount,
          product_data: {
            name: `${design.title} — custom transit-map tee`,
            description: `${garment.label} · Size ${size} · ${PRODUCT.name}`,
          },
        },
      })),
      shipping_address_collection: { allowed_countries: COUNTRIES },
      shipping_options: Object.entries(SHIPPING).map(([method, s]) => ({
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: s.label,
          fixed_amount: { amount: s.first + s.extra * (qty - 1), currency: PRODUCT.currency },
          delivery_estimate: { minimum: { unit: 'business_day', value: s.days[0] }, maximum: { unit: 'business_day', value: s.days[1] } },
          metadata: { prodigi: method },
        },
      })),
      phone_number_collection: { enabled: true },
      metadata,
      payment_intent_data: { metadata: { kind: 'transit-tee', design: design.title } },
      success_url: `${base}/order.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#design`,
    });
    // Opportunistic sweep after responding: catches any earlier paid order whose
    // webhook was missed and whose buyer never returned to the order page.
    waitUntil(reconcile(base).catch((e) => console.error('background reconcile', e)));
    return json({ url: session.url });
  } catch (e) {
    console.error('checkout error', e);
    return json({ error: 'Could not start checkout. Please try again.' }, 502);
  }
}
