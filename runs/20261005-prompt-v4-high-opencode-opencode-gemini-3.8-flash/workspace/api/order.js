'use strict';
const { fulfillSession } = require('./_lib/fulfill');
const { originOf } = require('./_lib/http');

module.exports = async (req, res) => {
  try {
    const sessionId = (req.query && req.query.session_id) || '';
    if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

    const out = await fulfillSession(sessionId, originOf(req));
    if (out.status === 'unpaid') {
      return res.status(200).json({
        status: 'unpaid',
        payment_status: out.payment_status,
        message: 'Payment has not completed yet.',
      });
    }
    return res.status(200).json(out);
  } catch (e) {
    console.error('order error', e);
    const code = e.code === 'verification' ? 409 : 500;
    return res.status(code).json({
      error: e.code === 'verification' ? e.message : 'Could not finalise order.',
      detail: e.message,
    });
  }
};
