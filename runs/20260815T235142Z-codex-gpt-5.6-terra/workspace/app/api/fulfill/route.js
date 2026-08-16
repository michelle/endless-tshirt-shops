import Stripe from 'stripe';
import sharp from 'sharp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const product = { fitted: 'bella-ladies-favorite-t-shirt', unisex: 'next-level-fitted-crew' };
const sizeMap = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' };
export async function GET(request) {
 try {
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) return Response.json({ message: 'Payment received. Your order confirmation is on its way.' });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') return Response.json({ message: 'Your payment is still processing.' }, { status: 202 });
  // Fulfillment is deliberately server-side. A production installation should invoke this
  // from a signed Stripe webhook and persist the order ID for strict idempotency.
  if (!process.env.SP_AUTH) return Response.json({ message: 'Your payment was received. Fulfillment will be confirmed by email.' });
  const address = session.shipping_details?.address; const meta = session.metadata || {};
  if (meta.fulfillment_order_id) return Response.json({ orderId: meta.fulfillment_order_id, message: `Your order is in! Confirmation ${meta.fulfillment_order_id}.` });
  if (process.env.FULFILLMENT_MODE === 'dry_run') return Response.json({ message: 'Your test payment was verified. Fulfillment is in dry-run mode, so no print order was submitted.' });
  if (!address || !product[meta.style]) return Response.json({ message: 'Your payment was received. We’ll confirm fulfillment by email.' });
  const auth = Buffer.from(`:${process.env.SP_AUTH}`).toString('base64');
  const captured = meta.captured_at || Date.now();
  const svg = `<svg width="1600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/><text x="800" y="220" text-anchor="middle" fill="white" font-family="monospace" font-size="120">${captured}</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const art = new FormData(); art.append('type', 'dtg'); art.append('sides[front][artwork]', new Blob([png], { type: 'image/png' }), 'datetime.png'); art.append('sides[front][dimensions][width]', '8'); art.append('sides[front][position][horizontal]', 'C'); art.append('sides[front][position][offset][top]', '3');
  const design = await fetch('https://api.scalablepress.com/v2/design', { method: 'POST', headers: { authorization: `Basic ${auth}` }, body: art });
  const designBody = await design.json();
  if (!design.ok || !designBody.designId) throw new Error(`Scalable Press design: ${designBody.message || design.status}`);
  const orderAddress = { name: session.shipping_details.name, address1: address.line1, address2: address.line2 || '', city: address.city, state: address.state, zip: address.postal_code, country: address.country, email: session.customer_details?.email || '' };
  const quote = await fetch('https://api.scalablepress.com/v2/quote', { method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'dtg', products: [{ id: product[meta.style], color: 'Black', quantity: 1, size: sizeMap[meta.size] }], designId: designBody.designId, address: orderAddress }) });
  const quoteBody = await quote.json();
  if (!quote.ok || !quoteBody.orderToken || quoteBody.orderIssues?.length) throw new Error(`Scalable Press quote: ${quoteBody.message || 'unavailable'}`);
  const order = await fetch('https://api.scalablepress.com/v2/order', { method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify({ orderToken: quoteBody.orderToken }) });
  const orderBody = await order.json();
  if (!order.ok || !orderBody.orderId) throw new Error(`Scalable Press order: ${orderBody.message || 'unavailable'}`);
  await stripe.checkout.sessions.update(sessionId, { metadata: { ...meta, fulfillment_order_id: orderBody.orderId } });
  return Response.json({ orderId: orderBody.orderId, message: `Your order is in! Confirmation ${orderBody.orderId}.` });
 } catch (err) { console.error('Fulfillment check failed', err.message); return Response.json({ message: 'Your payment was received. We’ll email your order confirmation shortly.' }); }
}
