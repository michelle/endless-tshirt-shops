const { stripeClient, json } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const sessionId = req.query?.session_id;
    if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json(res, 400, { error: 'Invalid session.' });
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return json(res, 200, { status: session.payment_status });
    return json(res, 200, { status: session.metadata?.fulfillment_status || 'pending', orderId: session.metadata?.order_id || null });
  } catch (error) {
    console.error('[order-status]', error);
    return json(res, 404, { error: 'Order not found.' });
  }
};
