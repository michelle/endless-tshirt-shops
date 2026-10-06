import Stripe from 'stripe';
import { env } from './config.js';

let client;
export function stripe() {
  client ||= new Stripe(env('STRIPE_SECRET_KEY'), { maxNetworkRetries: 2, appInfo: { name: 'overhead-store' } });
  return client;
}

export const isTestMode = () => /_test_/.test(process.env.STRIPE_SECRET_KEY || '');
