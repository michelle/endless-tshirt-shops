import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { parseDesign, PRODUCT } from '@/lib/store';
import { signSession, siteUrl, stripeClient } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function fulfill(sessionId: string) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid' || session.mode !== 'payment' || session.currency !== 'usd' || session.amount_total !== PRODUCT.price + PRODUCT.shipping) throw new Error('Unpaid or unexpected session');
  const design = parseDesign(session.metadata);
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address?.city || !address?.postal_code || address?.country !== 'US') throw new Error('Shipping address is missing');
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('Prodigi is not configured');
  const payload = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: { name: shipping.name,
      address: { line1: address.line1, line2: address.line2 || undefined, townOrCity: address.city, stateOrCounty: address.state || undefined, postalOrZipCode: address.postal_code, countryCode: address.country } },
    items: [{ merchantReference: 'moment-map-tee', sku: PRODUCT.sku, copies: 1, sizing: 'fitPrintArea', attributes: { color: design.color, size: design.size }, assets: [{ printArea: 'front', url: `${siteUrl()}/api/art?session=${encodeURIComponent(session.id)}&sig=${signSession(session.id)}` }] }],
    metadata: { stripeSession: session.id, design },
  };
  const base = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com';
  const response = await fetch(`${base}/v4.0/Orders`, { method: 'POST', headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok || !['Created', 'OnHold', 'AlreadyExists', 'CreatedWithIssues'].includes(data.outcome)) throw new Error(`Prodigi rejected order: ${JSON.stringify(data).slice(0, 500)}`);
  if (data.outcome === 'CreatedWithIssues') console.error('Prodigi order has issues', JSON.stringify(data.issues));
  console.log('Prodigi order', data.order?.id, 'for', session.id, data.outcome);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return new NextResponse('Webhook not configured', { status: 400 });
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(await req.text(), signature, secret); }
  catch (err) { console.error('Invalid webhook', err); return new NextResponse('Invalid signature', { status: 400 }); }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      try { await fulfill(session.id); }
      catch (err) { console.error('Fulfillment failed', err); return new NextResponse('Fulfillment failed; retry webhook', { status: 500 }); }
    }
  }
  return NextResponse.json({ received: true });
}
