import Stripe from 'stripe';
import { createProdigiOrder } from '../lib/fulfilment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'missing', { apiVersion: '2025-08-27.basil' });
export const config = { api: { bodyParser: false } };
async function rawBody(req) { const parts = []; for await (const part of req) parts.push(part); return Buffer.concat(parts); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed.');
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Webhook not configured.');
  try {
    const event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded' && event.data.object.metadata?.product === 'datetime-tee') {
      const payment = event.data.object; const saved = payment.shipping?.address || {};
      await createProdigiOrder({ payment, address: { name: payment.shipping?.name, line1: saved.line1, line2: saved.line2, city: saved.city, state: saved.state, postalCode: saved.postal_code, countryCode: saved.country }, origin: process.env.PUBLIC_APP_URL });
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error', error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }
}
