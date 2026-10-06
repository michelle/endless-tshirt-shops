// GET /api/config — public storefront configuration.
import { json, cors } from '../lib/http.mjs';
import { SHIRTS, SIZES } from '../public/lib/design.mjs';
import { pricing } from '../lib/spec.mjs';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.end();
  const { price, ship } = pricing(process.env);
  json(res, 200, {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    priceCents: price,
    shippingCents: ship,
    sizes: SIZES,
    shirts: Object.fromEntries(Object.entries(SHIRTS).map(([k, v]) => [k, { label: v.label, hex: v.hex, variant: v.variant }])),
    baseUrl: process.env.PUBLIC_BASE_URL || null,
  });
}
