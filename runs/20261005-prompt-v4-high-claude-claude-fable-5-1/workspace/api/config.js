// Public, non-secret configuration for the storefront.
import { SHIRTS, SIZE_LABELS } from '../public/lib/dayprint.js';
import { PRICE_CENTS, SHIPPING_CENTS, SHIP_COUNTRIES } from '../lib/stripe.js';
import { MIN_DATE, maxDate } from '../lib/weather.js';
import { MAX_CAPTION } from '../lib/spec.js';
import { json } from '../lib/http.js';

export default function handler(req, res) {
  json(res, 200, {
    price_cents: PRICE_CENTS(),
    shipping_cents: SHIPPING_CENTS(),
    currency: 'usd',
    min_date: MIN_DATE,
    max_date: maxDate(),
    max_caption: MAX_CAPTION,
    shirts: SHIRTS,
    size_labels: SIZE_LABELS,
    ship_countries: SHIP_COUNTRIES,
    payments_configured: Boolean(process.env.STRIPE_SECRET_KEY),
    print_env: (process.env.PRODIGI_API_BASE || 'sandbox').includes('sandbox') ? 'sandbox' : 'live',
    stripe_mode: (process.env.STRIPE_SECRET_KEY || '').includes('_test_') ? 'test' : 'live',
  }, { 'Cache-Control': 'no-store' });
}
