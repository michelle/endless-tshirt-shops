import Stripe from 'stripe';
import { fulfillSession } from '../../lib/fulfillment';

export const config = { api: { bodyParser: false } };

async function rawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'Webhook is not configured.' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') await fulfillSession(event.data.object.id);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failed', error);
    return res.status(400).json({ error: error.message });
  }
}
