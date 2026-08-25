const { json, PRODUCT_SKU } = require('./_lib');
module.exports = function handler(req, res) { return json(res, 200, { ok: true, environment: process.env.PRODIGI_API_URL?.includes('sandbox') === false ? 'live' : 'sandbox', stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY), prodigiConfigured: Boolean(process.env.PRODIGI_API_KEY), productSku: PRODUCT_SKU }); };
