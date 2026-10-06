// POST { design, shirt, items, country } → Stripe Checkout URL.
// Everything is re-validated and re-priced server-side; the client only sends choices.
import { readJson, send, methodGuard } from '../lib/http.js';
import { baseUrl } from '../lib/config.js';
import { stripe } from '../lib/stripe.js';
import { shippingOptions } from '../lib/prodigi.js';
import { packMetadata } from '../lib/orders.js';
import { printUrl } from '../lib/sign.js';
import { PRODUCT, shirtColor, sizeById, unitPrice, validateDesign, validateOrder } from '../public/catalog.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readJson(req);
    const dv = validateDesign(body.design);
    if (!dv.ok) return send(res, 400, { error: 'Please fix the highlighted fields', fields: dv.errors });
    const ov = validateOrder(body);
    if (!ov.ok) return send(res, 400, { error: ov.errors.join('. ') });

    const base = baseUrl(req);
    const design = dv.design;
    const shirt = shirtColor(body.shirt);
    const options = await shippingOptions({ country: body.country, shirt: shirt.id, items: ov.items });
    if (!options.length) return send(res, 502, { error: 'Shipping quotes are unavailable right now. Please try again.' });

    const previewImage = printUrl(base, design, shirt.id, { preview: true });
    const session = await stripe('POST', '/checkout/sessions', {
      mode: 'payment',
      success_url: `${base}/order.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#design`,
      line_items: ov.items.map((it) => ({
        quantity: it.qty,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: unitPrice(it.size),
          product_data: {
            name: `${design.name} — Lifeline Tee`,
            description: `${shirt.name} Bella+Canvas 3001 · Size ${sizeById(it.size).label} · ${design.stops.length} stops`,
            images: [previewImage],
          },
        },
      })),
      shipping_address_collection: { allowed_countries: [body.country] },
      shipping_options: options.map((o) => ({
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: `${o.label} shipping`,
          fixed_amount: { amount: o.amount, currency: PRODUCT.currency },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: o.estimate.min },
            maximum: { unit: 'business_day', value: o.estimate.max },
          },
          metadata: { prodigi_method: o.method },
        },
      })),
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      metadata: packMetadata({ design, shirt: shirt.id, items: ov.items, country: body.country, base }),
      payment_intent_data: { description: `Lifeline Tee: ${design.name}` },
    });
    send(res, 200, { url: session.url });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Could not start checkout. Please try again.' });
  }
}
