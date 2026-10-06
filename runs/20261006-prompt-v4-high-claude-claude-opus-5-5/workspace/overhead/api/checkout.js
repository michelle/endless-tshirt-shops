import { stripe } from '../lib/stripe.js';
import { json, siteUrl, PRODUCT, COUNTRIES } from '../lib/config.js';
import { shippingChargeCents } from '../lib/prodigi.js';
import { encodeDesign, printUrl, toMetadata } from '../lib/design-token.js';
import { validateDesign, SHIRTS, INKS } from '../public/shared/render.js';
import { getFonts } from '../lib/fonts.js';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  let design;
  try {
    design = validateDesign(body.design, getFonts());
  } catch (e) {
    return json({ error: e.message }, 400);
  }
  const shirt = SHIRTS[body.color];
  if (!shirt) return json({ error: 'Please choose a shirt colour' }, 400);
  if (!shirt.sizes.includes(body.size)) return json({ error: 'That size is not available in this colour' }, 400);
  if (INKS[design.ink].for !== shirt.tone) design.ink = shirt.tone === 'dark' ? 'starlight' : 'ink';
  const qty = Math.trunc(Number(body.qty) || 1);
  if (qty < 1 || qty > PRODUCT.maxQty) return json({ error: `Quantity must be 1–${PRODUCT.maxQty}` }, 400);
  const country = String(body.country || '');
  if (!COUNTRIES[country]) return json({ error: 'We do not ship to that country yet' }, 400);

  let shippingCents;
  try {
    shippingCents = await shippingChargeCents(country, qty);
  } catch (e) {
    console.error('quote failed', e);
    return json({ error: 'Could not calculate shipping right now — please try again.' }, 502);
  }

  const base = siteUrl(request);
  const token = encodeDesign(design);
  const label = design.headline || design.place || 'Custom star map';
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: qty,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.priceCents,
          product_data: {
            name: PRODUCT.name,
            description: `“${label}” · ${shirt.label} · ${body.size.toUpperCase()} · ${INKS[design.ink].label} ink`,
            images: [printUrl(base, token, `&preview=${encodeURIComponent(body.color)}`)],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: [country] },
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: 'Standard tracked shipping',
          type: 'fixed_amount',
          fixed_amount: { amount: shippingCents, currency: PRODUCT.currency },
          delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 12 } },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    metadata: { ...toMetadata(token), color: body.color, size: body.size, qty: String(qty), country },
    payment_intent_data: { metadata: { color: body.color, size: body.size, qty: String(qty) } },
    success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?cancelled=1`,
  });
  return json({ url: session.url, id: session.id });
}
