import { json, PRODUCT, COUNTRIES } from '../lib/config.js';
import { isTestMode } from '../lib/stripe.js';

export function GET() {
  return json({ priceCents: PRODUCT.priceCents, currency: PRODUCT.currency, maxQty: PRODUCT.maxQty, countries: COUNTRIES, testMode: isTestMode() }, 200, { 'cache-control': 'public, max-age=300' });
}
