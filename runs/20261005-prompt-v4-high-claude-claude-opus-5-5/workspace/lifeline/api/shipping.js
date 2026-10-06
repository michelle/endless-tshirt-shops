// POST { country, shirt, items } → live shipping options priced from Prodigi quotes.
import { readJson, send, methodGuard } from '../lib/http.js';
import { validateOrder } from '../public/catalog.js';
import { shippingOptions } from '../lib/prodigi.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  try {
    const body = await readJson(req);
    const v = validateOrder(body);
    if (!v.ok) return send(res, 400, { error: v.errors.join('. ') });
    const options = await shippingOptions({ country: body.country, shirt: body.shirt, items: v.items });
    if (!options.length) return send(res, 502, { error: 'Shipping quotes are unavailable right now. Please try again.' });
    send(res, 200, { options });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Could not price shipping' });
  }
}
