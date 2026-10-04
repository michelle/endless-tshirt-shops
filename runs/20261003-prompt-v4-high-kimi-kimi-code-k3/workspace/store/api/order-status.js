const Stripe = require('stripe');
const { orders } = require('../lib/store');
const { fulfill } = require('../lib/fulfill');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// GET /api/order-status?session_id=cs_... — polled by the success page.
// If payment is complete but fulfillment has not run yet (e.g. webhook delay),
// it runs here — idempotent via the Prodigi idempotency key.
module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const id = String(u.searchParams.get('session_id') || '');
    if (!id.startsWith('cs_')) throw new Error('bad session id');
    const session = await stripe.checkout.sessions.retrieve(id);
    let record = orders.get(id);
    if (session.payment_status === 'paid' && (!record || record.status === 'awaiting_payment' || record.status === 'processing')) {
      const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
      record = await fulfill(session, base);
    }
    res.status(200).json({
      paymentStatus: session.payment_status,
      fulfillment: record || { status: session.payment_status === 'paid' ? 'processing' : 'awaiting_payment' },
      design: session.metadata,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
