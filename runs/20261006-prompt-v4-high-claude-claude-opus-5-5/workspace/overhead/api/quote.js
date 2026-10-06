import { json, PRODUCT, COUNTRIES } from '../lib/config.js';
import { shippingChargeCents } from '../lib/prodigi.js';
import { isTestMode } from '../lib/stripe.js';

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  const country = q.get('country') || 'US';
  const qty = Math.min(PRODUCT.maxQty, Math.max(1, Math.trunc(Number(q.get('qty')) || 1)));
  if (!COUNTRIES[country]) return json({ error: 'Unsupported country' }, 400);
  try {
    const shippingCents = await shippingChargeCents(country, qty);
    return json({ country, qty, unitCents: PRODUCT.priceCents, shippingCents, totalCents: PRODUCT.priceCents * qty + shippingCents, testMode: isTestMode() }, 200, { 'cache-control': 'public, max-age=600' });
  } catch (e) {
    console.error(e);
    return json({ error: 'Shipping quote unavailable' }, 502);
  }
}
