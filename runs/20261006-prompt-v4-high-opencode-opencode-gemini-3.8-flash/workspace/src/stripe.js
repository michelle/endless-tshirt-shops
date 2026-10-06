import Stripe from 'stripe';
import { CONFIG } from './config.js';
import { CATALOG } from './catalog.js';

let stripeClient = null;

export function getStripe() {
  if (!stripeClient) {
    if (!CONFIG.stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(CONFIG.stripeSecretKey);
  }
  return stripeClient;
}

export async function createCheckoutSession({ design, designToken, publicBase }) {
  const stripe = getStripe();
  const themeName = CATALOG.themes[design.theme]?.name || 'Celestial';
  const garmentName = CATALOG.colors[design.garment]?.name || 'T-Shirt';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${publicBase}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicBase}/#studio`,
    allow_promotion_codes: false,
    phone_number_collection: { enabled: true },
    shipping_address_collection: {
      allowed_countries: CATALOG.countries,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CONFIG.currency,
          unit_amount: CONFIG.priceCents,
          product_data: {
            name: `AstroThread — “${design.inscription}” Star Map Tee`,
            description: `${themeName} on ${garmentName} (${design.size.toUpperCase()}) · ${design.locationName} (${design.date})`,
            images: [`${publicBase}/api/preview?token=${encodeURIComponent(designToken)}&w=800`],
          },
        },
      },
    ],
    metadata: {
      designToken,
      inscription: design.inscription,
      date: design.date,
      time: design.time,
      lat: String(design.lat),
      lon: String(design.lon),
      locationName: design.locationName,
      theme: design.theme,
      garment: design.garment,
      size: design.size,
    },
  });

  return session;
}

export async function retrieveSession(sessionId) {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer_details'],
  });
}

export function constructEvent(rawBody, signature, secret) {
  const stripe = getStripe();
  const webhookSecret = secret || CONFIG.stripeWebhookSecret;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Automatically registers the webhook endpoint with Stripe so incoming events
 * are routed directly to this deployment URL.
 */
export async function ensureWebhookEndpoint(publicBase) {
  const stripe = getStripe();
  const targetUrl = `${publicBase}/api/webhooks/stripe`;

  try {
    // Check existing endpoints
    const existing = await stripe.webhookEndpoints.list({ limit: 10 });
    const match = existing.data.find(
      (ep) => ep.url === targetUrl && ep.status === 'enabled'
    );

    if (match && match.secret) {
      CONFIG.stripeWebhookSecret = match.secret;
      return match.secret;
    }

    // Register new endpoint
    const created = await stripe.webhookEndpoints.create({
      url: targetUrl,
      enabled_events: [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
      ],
      description: 'AstroThread automated fulfillment endpoint',
    });

    if (created.secret) {
      CONFIG.stripeWebhookSecret = created.secret;
      return created.secret;
    }
  } catch (err) {
    console.warn('[webhook registration warning]', err.message);
  }
  return CONFIG.stripeWebhookSecret;
}
