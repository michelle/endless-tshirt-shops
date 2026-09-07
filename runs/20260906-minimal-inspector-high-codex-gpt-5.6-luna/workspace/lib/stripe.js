import Stripe from 'stripe';

let stripe;

export function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      appInfo: { name: 'datetime.store', version: '1.0.0' },
    });
  }
  return stripe;
}
