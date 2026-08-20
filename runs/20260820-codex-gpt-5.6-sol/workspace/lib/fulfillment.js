import sharp from 'sharp';
import { getStripe } from './stripe.js';

export const PRODUCTS = { fitted: 'bella-ladies-favorite-t-shirt', unisex: 'next-level-fitted-crew' };
export const SIZES = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' };
const SP_API = 'https://api.scalablepress.com/v2';

export function artworkSvg(timestamp) {
  const safeTimestamp = String(timestamp).replace(/[^0-9]/g, '').slice(0, 16);
  return `<svg width="2400" height="700" viewBox="0 0 2400 700" xmlns="http://www.w3.org/2000/svg"><rect width="2400" height="700" fill="transparent"/><text x="1200" y="365" fill="white" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="290" font-weight="700" letter-spacing="-10">${safeTimestamp}</text><text x="1200" y="520" fill="#a6a6a6" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="62" letter-spacing="18">UNIX TIME · MILLISECONDS</text></svg>`;
}

export async function spRequest(path, init = {}) {
  if (!process.env.SP_AUTH) throw new Error('Scalable Press is not configured');
  const response = await fetch(`${SP_API}${path}`, { ...init, headers: { Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString('base64')}`, ...init.headers } });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { message: text }; }
  if (!response.ok || body?.statusCode >= 300) {
    const error = new Error(body?.message || `Scalable Press request failed (${response.status})`);
    error.status = response.status;
    error.issues = body?.issues || body?.orderIssues || [];
    throw error;
  }
  return body;
}

export async function createDesign(timestamp) {
  const png = await sharp(Buffer.from(artworkSvg(timestamp))).png().toBuffer();
  const form = new FormData();
  form.append('type', 'dtg');
  form.append('sides[front][artwork]', new Blob([png], { type: 'image/png' }), 'timestamp.png');
  form.append('sides[front][dimensions][width]', '8');
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', '3');
  return spRequest('/design', { method: 'POST', body: form });
}

function shippingFromSession(session) {
  const details = session.collected_information?.shipping_details || session.shipping_details || session.customer_details;
  const address = details?.address || session.customer_details?.address;
  if (!address?.line1 || !address?.city || !address?.postal_code) throw new Error('Checkout did not return a complete shipping address');
  return { name: details?.name || session.customer_details?.name, address1: address.line1, address2: address.line2 || '', city: address.city, state: address.state || '', zip: address.postal_code };
}

export async function fulfillCheckout(sessionId) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') throw new Error('Payment has not completed');
  if (session.metadata?.sp_order_id) return { orderId: session.metadata.sp_order_id, status: 'ordered', existing: true };
  if (session.metadata?.sp_status === 'manual_review') return { orderId: `DESIGN-${session.metadata.sp_design_id}`, status: 'review', existing: true };
  if (session.metadata?.sp_quote_token && process.env.SP_FULFILLMENT_MODE !== 'order') return { orderId: session.metadata.sp_quote_token, status: 'quoted', existing: true };
  const { style, size, timestamp } = session.metadata || {};
  if (!PRODUCTS[style] || !SIZES[size] || !/^\d{13}$/.test(timestamp || '')) throw new Error('Checkout metadata is invalid');
  const design = await createDesign(timestamp);
  if (!design.designId) throw new Error('Scalable Press did not return a design ID');
  const quoteRequest = { type: 'dtg', sides: { front: 1 }, designId: design.designId, products: [{ id: PRODUCTS[style], color: 'Black', quantity: 1, size: SIZES[size] }], address: shippingFromSession(session) };
  let quote;
  try {
    quote = await spRequest('/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(quoteRequest) });
  } catch (error) {
    if (error.status < 500) throw error;
    const estimate = await spRequest('/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'dtg', sides: { front: 1 }, products: quoteRequest.products }) });
    await stripe.checkout.sessions.update(sessionId, { metadata: { ...session.metadata, sp_design_id: design.designId, sp_status: 'manual_review', sp_estimate: String(estimate.total ?? '') } });
    return { orderId: `DESIGN-${design.designId}`, status: 'review' };
  }
  if (quote.orderIssues?.length) throw new Error(quote.orderIssues.map(issue => issue.message).join('; '));
  if (!quote.orderToken) throw new Error('Scalable Press did not return an order token');
  if (process.env.SP_FULFILLMENT_MODE !== 'order') {
    await stripe.checkout.sessions.update(sessionId, { metadata: { ...session.metadata, sp_design_id: design.designId, sp_quote_token: quote.orderToken } });
    return { orderId: quote.orderToken, status: 'quoted' };
  }
  const order = await spRequest('/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderToken: quote.orderToken }) });
  if (!order.orderId) throw new Error('Scalable Press did not return an order ID');
  await stripe.checkout.sessions.update(sessionId, { metadata: { ...session.metadata, sp_design_id: design.designId, sp_order_id: order.orderId } });
  return { orderId: order.orderId, status: 'ordered' };
}
