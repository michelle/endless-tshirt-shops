import Stripe from 'stripe';
import { env } from './env';

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    client = new Stripe(env.stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      appInfo: { name: 'datetime.store', version: '1.0.0' },
    });
  }
  return client;
}
