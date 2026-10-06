'use strict';
// Stripe webhook: fulfils a paid order even if the customer never returns to
// the success page. Signature-verified; fulfillment is idempotent via Prodigi.
const crypto = require('crypto');
const { fulfillSession } = require('./_lib/fulfill');
const { originOf } = require('./_lib/http');

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySignature(payload, header, secret) {
  const parts = Object.fromEntries(
    String(header || '')
      .split(',')
      .map((p) => p.split('='))
  );
  if (!parts.t || !parts.v1) return false;
  const signed = `${parts.t}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  const a = Buffer.from(parts.v1);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(200).json({ skipped: 'no webhook secret configured' });

  const payload = (await rawBody(req)).toString('utf8');
  if (!verifySignature(payload, req.headers['stripe-signature'], secret)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data && event.data.object;
      if (session && session.id) {
        const out = await fulfillSession(session.id, originOf(req));
        console.log('webhook fulfilled', session.id, out.status, out.prodigiOrderId || '');
      }
    }
  } catch (e) {
    console.error('webhook fulfillment error', e);
    // Non-2xx so Stripe retries.
    return res.status(500).json({ error: 'fulfillment failed' });
  }
  return res.status(200).json({ received: true });
};

// Vercel must not parse the body before we verify the signature.
handler.config = { api: { bodyParser: false } };

module.exports = handler;
