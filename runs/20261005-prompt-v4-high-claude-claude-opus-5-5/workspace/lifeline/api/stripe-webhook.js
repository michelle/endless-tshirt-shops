// Stripe webhook. Instead of trusting the posted payload, we re-fetch the event by id
// from Stripe's API with our secret key — only genuine events from our account pass.
// (Add STRIPE_WEBHOOK_SECRET signature checks too once you own the Stripe account.)
import { readJson, send, methodGuard } from '../lib/http.js';
import { stripe } from '../lib/stripe.js';
import { fulfil } from '../lib/orders.js';

const FULFIL_ON = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  let eventId;
  try {
    eventId = (await readJson(req))?.id;
  } catch {
    return send(res, 400, { error: 'Bad payload' });
  }
  if (!eventId || !/^evt_[A-Za-z0-9]+$/.test(eventId)) return send(res, 400, { error: 'Bad event id' });

  let event;
  try {
    event = await stripe('GET', `/events/${eventId}`);
  } catch (e) {
    return send(res, 400, { error: 'Unknown event' });
  }
  if (!FULFIL_ON.has(event.type)) return send(res, 200, { received: true, ignored: event.type });

  try {
    const { prodigiOrderId, session } = await fulfil(event.data.object.id);
    send(res, 200, { received: true, paid: session.payment_status === 'paid', prodigiOrderId });
  } catch (e) {
    console.error('webhook fulfilment failed', e);
    send(res, 500, { error: 'Fulfilment failed; Stripe will retry' });
  }
}
