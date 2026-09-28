import Stripe from 'stripe';

// Lazily construct the Stripe client so the module can be imported in
// environments where the key is not set (e.g. during static analysis).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _stripe = new Stripe(key, {
    apiVersion: '2024-06-20',
    appInfo: { name: 'lunaria', version: '1.0.0' },
  });
  return _stripe;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}
