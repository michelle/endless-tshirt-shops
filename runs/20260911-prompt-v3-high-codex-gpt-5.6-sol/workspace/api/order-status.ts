import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.STRIPE_SECRET_KEY) return response.status(503).json({ error: 'Payment verification is not configured.' });
  const sessionId = Array.isArray(request.query.session_id) ? request.query.session_id[0] : request.query.session_id;
  if (!sessionId || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return response.status(400).json({ error: 'Invalid checkout session.' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return response.status(200).json({ paid: session.payment_status === 'paid', status: session.payment_status });
  } catch {
    return response.status(404).json({ error: 'Checkout session not found.' });
  }
}
