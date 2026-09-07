import Stripe from 'stripe';
import fs from 'node:fs';
process.loadEnvFile('.env.local');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpoint = await stripe.webhookEndpoints.create({
  url: process.env.APP_URL + '/api/stripe/webhook',
  enabled_events: [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
  ],
  description: 'datetime.store payment-confirmed Prodigi fulfillment',
});
fs.appendFileSync(
  '.env.local',
  '\nSTRIPE_WEBHOOK_SECRET=' + endpoint.secret + '\n',
);
fs.writeFileSync('/tmp/datetime-webhook-id', endpoint.id);
console.log('Created Stripe webhook:', endpoint.id);
