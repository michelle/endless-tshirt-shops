import Stripe from 'stripe';
import { SHIRT_COLORS } from './catalog.js';
import { formatDate } from './design.js';

export const itemTitle = (item) => `Orrery Tee: ${item.name}`;
export const itemDescription = (item) =>
  `${formatDate(item.date).long} sky · ${SHIRT_COLORS[item.color].label} · size ${item.size.toUpperCase()}`;

export function createStripeProvider({ secretKey, webhookSecret, baseUrl, stripeOptions = {} }) {
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 2, ...stripeOptions });
  const isHttps = baseUrl.startsWith('https://');

  return {
    name: 'stripe',

    async createCheckout(order) {
      const orderUrl = `${baseUrl}/order/${order.id}?t=${order.token}`;
      const line_items = order.items.map((item) => ({
        quantity: item.qty,
        price_data: {
          currency: order.currency,
          unit_amount: item.unitCents,
          product_data: {
            name: itemTitle(item),
            description: itemDescription(item),
            ...(isHttps
              ? { images: [`${baseUrl}/api/preview.png?${new URLSearchParams({ date: item.date, name: item.name, line: item.line, color: item.color, accent: item.accent, w: '600', bg: '1' })}`] }
              : {}),
          },
        },
      }));
      line_items.push({
        quantity: 1,
        price_data: {
          currency: order.currency,
          unit_amount: order.shippingCents,
          product_data: { name: 'Shipping', description: `To ${order.recipient.country}` },
        },
      });
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items,
          customer_email: order.email,
          client_reference_id: order.id,
          metadata: { orderId: order.id },
          payment_intent_data: { metadata: { orderId: order.id }, description: `Orrery order ${order.id}` },
          success_url: `${orderUrl}&paid=1`,
          cancel_url: `${baseUrl}/?canceled=1#cart`,
          expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        },
        { idempotencyKey: `checkout-${order.id}` },
      );
      return { url: session.url, ref: session.id };
    },

    parseWebhook(rawBody, signature) {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    },

    // Normalises a Checkout Session into what the order service cares about.
    describeSession(session) {
      return {
        ref: session.id,
        orderId: session.metadata?.orderId || session.client_reference_id,
        paid: session.payment_status === 'paid',
        amountCents: session.amount_total,
        currency: session.currency,
        expired: session.status === 'expired',
      };
    },

    async retrieveSession(ref) {
      return this.describeSession(await stripe.checkout.sessions.retrieve(ref));
    },
  };
}

export function createDemoProvider({ baseUrl }) {
  return {
    name: 'demo',
    async createCheckout(order) {
      return { url: `${baseUrl}/demo-pay/${order.id}?t=${order.token}`, ref: `demo_${order.id}` };
    },
  };
}
