import Stripe from 'stripe';
import { normalizeAddress, stripeShipping } from '../lib/fulfilment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'missing', { apiVersion: '2025-08-27.basil' });
const allowedStyles = new Set(['fitted', 'unisex']);
const allowedSizes = new Set(['S', 'M', 'L', 'XL', '2XL']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const { email, style, size, timestamp, address } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !allowedStyles.has(style) || !allowedSizes.has(size) || !/^\d{13}$/.test(String(timestamp)) || !normalizeAddress(address)) {
    return res.status(400).json({ error: 'Please check your email, style, size, and timestamp.' });
  }
  if (style === 'fitted' && address.countryCode !== 'US') {
    return res.status(400).json({ error: 'The fitted shirt is currently available for US delivery only. Please choose unisex for international shipping.' });
  }
  try {
    const intent = await stripe.paymentIntents.create({
      amount: 2250,
      currency: 'usd',
      receipt_email: email,
      shipping: stripeShipping(address),
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `datetime.store ${style} tee, ${size}`,
      metadata: { product: 'datetime-tee', style, size, capturedAt: String(timestamp) }
    });
    return res.status(200).json({ clientSecret: intent.client_secret });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Could not start payment.' });
  }
}
