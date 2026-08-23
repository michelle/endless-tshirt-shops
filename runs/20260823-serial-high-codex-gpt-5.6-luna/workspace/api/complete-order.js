const { stripeClient, json } = require('./_lib');
const webhook = require('./stripe-webhook');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const sessionId = req.body?.session_id;
    if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json(res, 400, { error: 'Invalid session.' });
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return json(res, 409, { status: session.payment_status });
    await webhook.fulfill(session);
    const updated = await stripeClient().checkout.sessions.retrieve(sessionId);
    return json(res, 200, { status: updated.metadata?.fulfillment_status || 'pending', orderId: updated.metadata?.order_id || null });
  } catch (error) {
    console.error('[complete-order]', error);
    return json(res, 502, { error: error.message || 'Payment succeeded, but fulfillment needs attention.' });
  }
};
