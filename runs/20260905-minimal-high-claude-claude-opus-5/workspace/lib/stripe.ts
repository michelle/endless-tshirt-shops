import Stripe from 'stripe';
import { requireEnv } from './env';

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    client = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
      appInfo: { name: 'datetime.store', version: '1.0.0' },
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return client;
}
