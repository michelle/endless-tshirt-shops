import Stripe from 'stripe';
import { createProdigiOrder } from '../lib/fulfilment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'missing', { apiVersion: '2025-08-27.basil' });
function originFor(req) { return process.env.PUBLIC_APP_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`; }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const { paymentIntentId, address } = req.body || {};
  if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId || '')) return res.status(400).json({ error: 'Please provide a valid payment.' });
  try {
    const payment = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (payment.status !== 'succeeded' || payment.metadata.product !== 'datetime-tee') return res.status(400).json({ error: 'Payment has not completed.' });
    const saved = payment.shipping?.address || {};
    const fallback = { name: payment.shipping?.name, line1: saved.line1, line2: saved.line2, city: saved.city, state: saved.state, postalCode: saved.postal_code, countryCode: saved.country };
    return res.status(200).json(await createProdigiOrder({ payment, address: address || fallback, origin: originFor(req) }));
  } catch (error) {
    console.error('Fulfilment error', error.message);
    return res.status(502).json({ error: error.message || 'Your payment could not be verified or fulfilment could not be started.' });
  }
}
