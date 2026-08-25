import Stripe from 'stripe';
import { fulfillSession } from './fulfill';
export const config = { api: { bodyParser: false } };
async function readBody(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); return Buffer.concat(chunks); }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).end();
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const event = stripe.webhooks.constructEvent(await readBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') await fulfillSession(event.data.object.id, `https://${req.headers.host}`);
    return res.status(200).json({ received: true });
  } catch (error) { console.error('Webhook error', error.message); return res.status(400).send(`Webhook Error: ${error.message}`); }
}
