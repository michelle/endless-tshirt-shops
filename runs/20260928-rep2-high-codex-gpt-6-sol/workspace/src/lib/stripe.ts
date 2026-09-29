import Stripe from 'stripe';
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to enable checkout.');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
