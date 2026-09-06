import Stripe from 'stripe';

let stripeClient: Stripe | undefined;

export function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    stripeClient = new Stripe(key, { appInfo: { name: 'datetime.store rebuild', version: '1.0.0' } });
  }
  return stripeClient;
}

export function getProdigiConfig() {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error('PRODIGI_API_KEY is not configured');
  return {
    apiKey,
    baseUrl: (process.env.PRODIGI_API_URL || 'https://api.sandbox.prodigi.com/v4.0').replace(/\/$/, ''),
  };
}

export function getAppUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error('APP_URL is not configured');
  return value.replace(/\/$/, '');
}
