const { fulfillCheckoutSession, getStripe, json } = require('./_lib');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' }); const sessionId = typeof req.query?.session_id === 'string' ? req.query.session_id : null; if (!sessionId || !/^cs_(test|live)_/.test(sessionId)) return json(res, 400, { error: 'A valid checkout session is required.' });
  try { const session = await getStripe().checkout.sessions.retrieve(sessionId); const result = await fulfillCheckoutSession(req, session); return json(res, result.status === 'fulfilled' ? 200 : 202, result); } catch (error) { console.error('[complete-order]', error); return json(res, 502, { status: 'pending', error: 'Payment received; fulfillment will retry automatically.' }); }
};
