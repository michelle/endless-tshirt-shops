// Turns a paid Stripe Checkout Session into a Prodigi order — exactly once.
// Called from the Stripe webhook AND (as a safety net) from the order-status endpoint the
// success page polls. Duplicate calls are harmless: we check the PaymentIntent for an existing
// Prodigi order id, and Prodigi itself de-duplicates on idempotencyKey (= Checkout Session id).
import { stripe } from './stripe.js';
import { createOrder } from './prodigi.js';
import { decodeDesign, fromMetadata, printUrl } from './design-token.js';
import { validateDesign, SHIRTS } from '../public/shared/render.js';
import { getFonts } from './fonts.js';

export async function fulfillSession(sessionId, baseUrl) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  const result = summarize(session);
  if (session.payment_status !== 'paid') return { ...result, state: 'awaiting_payment' };

  const pi = session.payment_intent;
  if (pi?.metadata?.prodigi_order_id) {
    return { ...result, state: 'sent_to_print', prodigiOrderId: pi.metadata.prodigi_order_id };
  }

  const md = session.metadata || {};
  const token = fromMetadata(md);
  validateDesign(decodeDesign(token), getFonts()); // never send anything we can't render
  const color = md.color;
  const size = md.size;
  if (!SHIRTS[color]?.sizes.includes(size)) throw new Error(`Invalid colour/size in session ${sessionId}`);

  const ship = session.collected_information?.shipping_details || session.shipping_details;
  if (!ship?.address) throw new Error(`No shipping address on session ${sessionId}`);
  const a = ship.address;
  const recipient = {
    name: ship.name || session.customer_details?.name,
    email: session.customer_details?.email || undefined,
    phoneNumber: session.customer_details?.phone || undefined,
    address: {
      line1: a.line1,
      line2: a.line2 || undefined,
      postalOrZipCode: a.postal_code || '',
      countryCode: a.country,
      townOrCity: a.city || a.state || '',
      stateOrCounty: a.state || undefined,
    },
  };

  const order = await createOrder({
    idempotencyKey: session.id,
    merchantReference: session.id.slice(-24),
    recipient,
    color,
    size,
    copies: Number(md.qty) || 1,
    assetUrl: printUrl(baseUrl, token),
    metadata: { stripeCheckoutSession: session.id, stripePaymentIntent: pi?.id || '' },
  });

  if (pi?.id) {
    await stripe().paymentIntents.update(pi.id, { metadata: { prodigi_order_id: order.id } });
  }
  console.log(`Fulfilled ${session.id} -> Prodigi ${order.id}`);
  return { ...result, state: 'sent_to_print', prodigiOrderId: order.id, prodigiStatus: order.status?.stage };
}

function summarize(session) {
  const md = session.metadata || {};
  return {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    email: session.customer_details?.email,
    color: md.color,
    size: md.size,
    qty: Number(md.qty) || 1,
    designToken: (() => { try { return fromMetadata(md); } catch { return null; } })(),
  };
}
