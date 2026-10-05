'use strict';
/**
 * Payment provider abstraction.
 *
 * Provider is Stripe Checkout whenever STRIPE_SECRET_KEY (+ webhook secret)
 * is configured. Without keys the store runs in DEMO mode: a built-in
 * simulated checkout that mirrors the hosted-checkout + webhook flow so the
 * full order lifecycle can be exercised end to end. Fulfillment is triggered
 * by the same code path in both modes and only after payment succeeds.
 */
const Stripe = require('stripe');
const config = require('./config');
const store = require('./store');

let stripeClient = null;
function stripe() {
  if (!config.stripe.enabled) return null;
  if (!stripeClient) stripeClient = new Stripe(config.stripe.secretKey);
  return stripeClient;
}

function orderTotalCents(o) {
  return config.pricing.unitAmount * o.product.qty + config.pricing.shippingAmount;
}

/** Create a checkout session (Stripe) or point at the built-in demo pay page. */
async function createCheckout(order, baseUrl) {
  const total = orderTotalCents(order);
  const s = stripe();
  if (s) {
    const session = await s.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: order.id,
      customer_email: order.customer.email,
      line_items: [
        {
          quantity: order.product.qty,
          price_data: {
            currency: config.pricing.currency,
            unit_amount: config.pricing.unitAmount,
            product_data: {
              name: `NightLoom star-map tee — ${order.product.size.toUpperCase()}, ${order.product.color}`,
              description: `${order.design.title || 'Custom sky'} · ${order.design.date} ${order.design.time || ''} · ${order.design.placeName}`,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: config.pricing.currency,
            unit_amount: config.pricing.shippingAmount,
            product_data: { name: 'Shipping' },
          },
        },
      ],
      metadata: { orderId: order.id, expectedTotal: String(total) },
      success_url: `${baseUrl}/order/${order.id}?paid=1`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
    });
    return { provider: 'stripe', url: session.url, reference: session.id };
  }
  return { provider: 'demo', url: `${baseUrl}/pay/${order.id}`, reference: null };
}

/**
 * Verify + apply a Stripe webhook event. Returns the orderId when a payment
 * completed, else null. Throws on invalid signature.
 */
function handleStripeWebhook(rawBody, signature) {
  const s = stripe();
  if (!s) throw new Error('Stripe is not configured');
  const event = s.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return { orderId: null, event };
  }
  const session = event.data.object;
  const orderId = session.metadata && session.metadata.orderId;
  if (!orderId) return { orderId: null, event };
  const order = store.getOrder(orderId);
  if (!order) throw new Error(`Unknown order ${orderId} in Stripe metadata`);
  if (session.metadata.expectedTotal && Number(session.metadata.expectedTotal) !== session.amount_total) {
    throw new Error(`Amount mismatch for ${orderId}: expected ${session.metadata.expectedTotal}, got ${session.amount_total}`);
  }
  return { orderId, reference: session.id, event };
}

module.exports = { createCheckout, handleStripeWebhook, orderTotalCents, stripe };
