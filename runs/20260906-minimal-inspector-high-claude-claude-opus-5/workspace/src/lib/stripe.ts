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

/**
 * Constant-time-ish comparison for the client secret a browser hands back when
 * it asks about its own order. The secret is the capability: whoever holds it
 * created the intent.
 */
export function clientSecretMatches(expected: string | null, provided: string): boolean {
  if (!expected || expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
