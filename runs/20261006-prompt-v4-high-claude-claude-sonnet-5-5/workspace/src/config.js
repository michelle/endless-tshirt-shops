'use strict';
const crypto = require('crypto');

const env = process.env;
const prodigiEnv = (env.PRODIGI_ENV || 'sandbox').toLowerCase();
const production = env.NODE_ENV === 'production';

if (production && !env.SIGNING_SECRET) {
  throw new Error('SIGNING_SECRET must be set in production');
}

const stripeKey = env.STRIPE_SECRET_KEY || '';
let paymentProvider = (env.PAYMENT_PROVIDER || 'auto').toLowerCase();
if (paymentProvider === 'auto') paymentProvider = stripeKey ? 'stripe' : 'demo';
if (paymentProvider === 'demo' && prodigiEnv === 'live') {
  throw new Error('Demo payments cannot be used with the live Prodigi environment. Configure STRIPE_SECRET_KEY.');
}
if (paymentProvider === 'stripe' && !stripeKey) throw new Error('PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY');

module.exports = {
  port: Number(env.PORT) || 3000,
  publicUrl: (env.PUBLIC_URL || '').replace(/\/$/, ''),
  signingSecret: env.SIGNING_SECRET || crypto.createHash('sha256').update('asterism-dev-only-secret').digest('hex'),
  prodigi: {
    apiKey: env.PRODIGI_API_KEY || '',
    baseUrl: prodigiEnv === 'live' ? 'https://api.prodigi.com/v4.0' : 'https://api.sandbox.prodigi.com/v4.0',
    env: prodigiEnv,
  },
  stripe: { secretKey: stripeKey, webhookSecret: env.STRIPE_WEBHOOK_SECRET || '' },
  paymentProvider,
  production,
};
