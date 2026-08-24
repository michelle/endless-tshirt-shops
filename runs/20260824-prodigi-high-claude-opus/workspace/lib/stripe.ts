import Stripe from 'stripe';
import { env } from './env';

let client: Stripe | undefined;

export function stripe(): Stripe {
  if (!client) {
    client = new Stripe(env.stripeSecretKey, {
      appInfo: { name: 'datetime.store', version: '1.0.0' },
      maxNetworkRetries: 2,
    });
  }
  return client;
}
