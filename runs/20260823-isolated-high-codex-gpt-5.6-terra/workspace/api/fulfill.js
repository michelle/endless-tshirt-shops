const {stripe, fulfill, json} = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, {error:'Method not allowed.'});
  try {
    const sessionId = String(req.body?.sessionId || '');
    if (!/^cs_(test|live)_/.test(sessionId)) throw new Error('Invalid checkout session.');
    const session = await stripe(`/checkout/sessions/${sessionId}`);
    if (session.payment_status !== 'paid') throw new Error('Payment has not completed.');
    if (session.metadata?.fulfillment_order_id) return json(res, 200, {orderId:session.metadata.fulfillment_order_id, alreadyFulfilled:true});
    const orderId = await fulfill(session);
    await stripe(`/checkout/sessions/${sessionId}`, {'metadata[fulfillment_order_id]':orderId, 'metadata[fulfilled_at]':new Date().toISOString()});
    return json(res, 200, {orderId});
  } catch (error) { console.error('Fulfillment failed', error); return json(res, 502, {error:error.message || 'Unable to prepare fulfillment.'}); }
};
