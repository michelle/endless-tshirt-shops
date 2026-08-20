import Stripe from 'stripe';

let client;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: 'datetime.store', version: '1.0.0' } });
  return client;
}
