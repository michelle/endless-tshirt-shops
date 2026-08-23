import Stripe from 'stripe';
import { Resvg } from '@resvg/resvg-js';

const PRODUCTS = { fitted: 'next-level-boyfriend-tee', unisex: 'next-level-fitted-crew' };
const SIZES = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' };
const API = 'https://api.scalablepress.com/v2';

function artwork(timestamp) {
  // A transparent image means the shirt's black fabric remains the background;
  // only the white timestamp is laid down by the DTG printer.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="700" viewBox="0 0 1800 700"><text x="900" y="405" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="142" font-weight="500" letter-spacing="7">${timestamp}</text></svg>`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1800 }, background: 'rgba(0,0,0,0)' }).render().asPng();
}

function authHeaders() {
  return { Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString('base64')}` };
}

async function spJson(path, init) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.statusCode >= 300) throw new Error(body.message || body.error || `Scalable Press request failed (${response.status})`);
  return body;
}

async function createDesign(timestamp) {
  const form = new FormData();
  form.append('type', 'dtg');
  form.append('sides[front][artwork]', new Blob([artwork(timestamp)], { type: 'image/png' }), 'datetime.png');
  form.append('sides[front][dimensions][width]', '8');
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', '3');
  const result = await spJson('/design', { method: 'POST', body: form });
  if (!result.designId) throw new Error('Scalable Press did not return a design ID.');
  return result.designId;
}

function shipping(session) {
  const details = session.collected_information?.shipping_details || session.shipping_details || {};
  const address = details.address || session.customer_details?.address || {};
  return { name: details.name || session.customer_details?.name || 'Customer', address1: address.line1, address2: address.line2 || '', city: address.city, state: address.state, zip: address.postal_code, country: address.country || 'US' };
}

export async function fulfillSession(sessionId) {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  if (session.payment_status !== 'paid') return { status: 'unpaid', email: session.customer_details?.email };
  const paymentIntent = session.payment_intent;
  const metadata = paymentIntent?.metadata || session.metadata || {};
  if (metadata.product !== 'datetime-shirt') return { status: 'ignored' };
  if (metadata.fulfillment_status === 'fulfilled') return { status: 'fulfilled', orderId: metadata.scalable_press_order_id, email: session.customer_details?.email };
  if (metadata.fulfillment_status === 'processing') return { status: 'processing', email: session.customer_details?.email };

  if (!paymentIntent?.id) throw new Error('No PaymentIntent was attached to this order.');
  await stripe.paymentIntents.update(paymentIntent.id, { metadata: { ...metadata, fulfillment_status: 'processing' } });
  try {
    if (process.env.SP_DRY_RUN === 'true') {
      await stripe.paymentIntents.update(paymentIntent.id, { metadata: { ...metadata, fulfillment_status: 'fulfilled', scalable_press_order_id: 'dry-run' } });
      return { status: 'dry_run', orderId: 'dry-run', email: session.customer_details?.email };
    }
    if (!process.env.SP_AUTH) throw new Error('Scalable Press is not configured.');
    const style = metadata.style;
    const size = metadata.size;
    if (!PRODUCTS[style] || !SIZES[size]) throw new Error('Order contains an invalid shirt variant.');
    const designId = await createDesign(metadata.timestamp);
    const quote = await spJson('/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'dtg', products: [{ id: PRODUCTS[style], color: 'Black', quantity: 1, size: SIZES[size] }], designId, address: shipping(session) }) });
    if (!quote.orderToken || quote.orderIssues?.length) throw new Error(quote.orderIssues?.[0]?.message || 'Scalable Press could not quote this shipment.');
    const order = await spJson('/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderToken: quote.orderToken }) });
    if (!order.orderId) throw new Error('Scalable Press did not return an order ID.');
    await stripe.paymentIntents.update(paymentIntent.id, { metadata: { ...metadata, fulfillment_status: 'fulfilled', scalable_press_order_id: String(order.orderId), scalable_press_design_id: String(designId) } });
    return { status: 'fulfilled', orderId: order.orderId, email: session.customer_details?.email };
  } catch (error) {
    await stripe.paymentIntents.update(paymentIntent.id, { metadata: { ...metadata, fulfillment_status: 'failed', fulfillment_error: String(error.message).slice(0, 450) } });
    throw error;
  }
}
