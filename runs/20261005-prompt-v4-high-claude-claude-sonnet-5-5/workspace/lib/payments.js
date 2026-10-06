import Stripe from 'stripe';
import crypto from 'node:crypto';
import { config } from './config.js';
import { sign } from './sign.js';
import { COUNTRY_NAMES, SHIPPING, encodeDesign, decodeDesign, priceCents } from './design.js';
import { createPrintOrder } from './prodigi.js';

let stripeClient;
export function stripe() {
  if (!stripeClient) stripeClient = new Stripe(config.stripeSecretKey);
  return stripeClient;
}

// Test seam: lets tests supply a fake Stripe client.
export function setStripeClientForTests(client) {
  stripeClient = client;
}

export function orderTotalCents(design, country) {
  return priceCents(design.size) + SHIPPING[country];
}

function productName(design) {
  return `Skyprint Tee — ${design.title || design.place}`;
}

// Creates a Stripe Checkout Session. Shipping is fixed per destination country, which the
// customer picks in the designer, so Checkout only offers that one country and rate.
export async function createStripeCheckout({ design, country, origin }) {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: priceCents(design.size),
          product_data: {
            name: productName(design),
            description: `Custom night-sky tee · ${design.place} · ${design.date} ${design.time} · ${design.shirt.replace('-', ' ')} · size ${design.size.toUpperCase()}`,
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: [country] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: `Standard shipping to ${COUNTRY_NAMES[country]}`,
          fixed_amount: { amount: SHIPPING[country], currency: 'usd' },
          delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 12 } },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    custom_text: {
      submit: { message: 'Your shirt is printed to order from this exact design, so it cannot be returned unless it arrives damaged or misprinted.' },
    },
    metadata: { design: encodeDesign(design), country },
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1#design`,
  });
  return session.url;
}

export function createDemoCheckoutUrl({ design, country, origin }) {
  const token = sign({ t: 'demo-checkout', design: encodeDesign(design), country, exp: Date.now() + 60 * 60 * 1000 });
  return `${origin}/demo-checkout?token=${encodeURIComponent(token)}`;
}

export function printUrlFor(origin, ref, design) {
  // Only issued after payment is confirmed; the token is an HMAC over the exact design.
  const token = sign({ t: 'print', ref, design: encodeDesign(design) });
  return `${origin}/api/print/${token}.png`;
}

function recipientFromSession(session) {
  const ship = session.collected_information?.shipping_details || session.shipping_details;
  const a = ship?.address;
  if (!ship || !a) return null;
  return {
    name: ship.name || session.customer_details?.name || 'Customer',
    email: session.customer_details?.email,
    phone: session.customer_details?.phone,
    address: { line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postal_code, country: a.country },
  };
}

// Fulfil a Stripe Checkout Session: only when Stripe says it is paid. Safe to call repeatedly.
export async function fulfillStripeSession(sessionId, origin) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') return { ok: false, reason: 'unpaid', session };
  const decoded = decodeDesign(session.metadata?.design || '');
  if (!decoded.ok) return { ok: false, reason: 'bad-design', session };
  const recipient = recipientFromSession(session);
  if (!recipient) return { ok: false, reason: 'no-address', session };
  const ref = session.id;
  const result = await createPrintOrder({ ref, design: decoded.design, printUrl: printUrlFor(origin, ref, decoded.design), recipient });
  return { ...result, session, ref };
}

// Demo mode: no money moves. Only available when Prodigi is in sandbox mode and Stripe is not configured.
export async function fulfillDemoOrder({ design, recipient, origin }) {
  if (!config.demoPayments) throw new Error('Demo payments are disabled.');
  const ref = `demo_${crypto.randomBytes(8).toString('hex')}`;
  const result = await createPrintOrder({ ref, design, printUrl: printUrlFor(origin, ref, design), recipient });
  return { ...result, ref };
}
