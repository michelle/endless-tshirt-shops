const Stripe = require('stripe');
const { fulfill } = require('../lib/fulfill');
const { orders, processedEvents } = require('../lib/store');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function debugSink(payload) {
  const sink = process.env.DEBUG_SINK;
  if (!sink) return;
  try {
    await fetch(sink, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { /* best effort */ }
}

// POST /api/webhook — Stripe events. Shirts go to Prodigi ONLY after payment succeeds.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  let raw = await readRaw(req);
  // Some runtimes pre-parse the JSON body, leaving the stream empty
  if (raw.length === 0 && req.body) {
    raw = Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }
  let event;
  let verified = false;

  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (whsec) {
    try {
      event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], whsec);
      verified = true;
    } catch (e) {
      await debugSink({ stage: 'signature', error: e.message, rawLen: raw.length, hasBody: !!req.body });
      res.status(400).json({ error: `signature verification failed: ${e.message}` });
      return;
    }
  } else {
    // No webhook secret configured: accept the event but re-fetch the session
    // from Stripe so the data is authenticated by the API, not the payload.
    try {
      event = JSON.parse(raw.toString());
    } catch {
      res.status(400).json({ error: 'bad payload' });
      return;
    }
  }

  if (event.type === 'checkout.session.completed') {
    if (processedEvents.has(event.id)) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    processedEvents.set(event.id, true);
    try {
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      if (session.payment_status === 'paid') {
        const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
        const record = await fulfill(session, base);
        await debugSink({ stage: 'fulfilled', verified, eventId: event.id, record });
      } else {
        orders.set(session.id, { status: 'awaiting_payment', at: new Date().toISOString() });
        await debugSink({ stage: 'awaiting_payment', verified, eventId: event.id });
      }
    } catch (e) {
      await debugSink({ stage: 'error', error: e.message, stack: String(e.stack || '').slice(0, 600) });
      res.status(500).json({ error: e.message });
      return;
    }
  }

  res.status(200).json({ received: true });
};
