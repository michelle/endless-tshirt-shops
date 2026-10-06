// Stripe integration. The customer pays through Stripe-hosted Checkout; the
// order is only forwarded to Prodigi once Stripe confirms payment_status=paid.

import Stripe from 'stripe';
import { CONFIG } from './config.js';

let client = null;
export function stripe() {
  if (!client) {
    if (!CONFIG.stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not set');
    client = new Stripe(CONFIG.stripeSecretKey);
  }
  return client;
}

export async function createCheckoutSession({ design, designToken, publicBase }) {
  const s = stripe();
  const message = design.message.length > 40 ? design.message.slice(0, 37) + '…' : design.message;
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    success_url: `${publicBase}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicBase}/#design`,
    allow_promotion_codes: false,
    phone_number_collection: { enabled: true },
    shipping_address_collection: {
      allowed_countries: [
        'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'NL', 'BE', 'ES', 'IT',
        'PT', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'JP', 'SG', 'HK',
      ],
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CONFIG.currency,
          unit_amount: CONFIG.priceCents,
          product_data: {
            name: `Echoform Tee — “${message}”`,
            description: `One-of-one soundprint · ${design.garment} / size ${design.size.toUpperCase()} · free tracked shipping`,
          },
        },
      },
    ],
    metadata: {
      designToken,
      message: design.message,
      dedication: design.dedication,
      theme: design.theme,
      garment: design.garment,
      size: design.size,
      variant: String(design.variant),
      serial: design.serial,
    },
  });
  return session;
}

export async function retrieveSession(id) {
  return stripe().checkout.sessions.retrieve(id);
}

export function constructEvent(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}
