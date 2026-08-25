const Stripe = require('stripe');
const { fulfillCheckoutSession, json } = require('./_lib');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' }); if (!process.env.STRIPE_WEBHOOK_SECRET) return json(res, 503, { error: 'Stripe webhook secret is not configured.' });
  try { const chunks = []; for await (const chunk of req) chunks.push(chunk); const raw = Buffer.concat(chunks); const event = Stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') await fulfillCheckoutSession(req, event.data.object); return json(res, 200, { received: true }); }
  catch (error) { console.error('[stripe-webhook]', error); return json(res, 400, { error: 'Webhook signature or fulfillment failed.' }); }
};
module.exports.config = { api: { bodyParser: false } };
