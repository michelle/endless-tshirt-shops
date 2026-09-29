import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { normalizeDesign } from '@/lib/design';
import { stripeClient } from '@/lib/stripe';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  const stripe = stripeClient();
  let event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 }); }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return NextResponse.json({ received: true });
  try {
    const sessionId = (event.data.object as { id: string }).id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return NextResponse.json({ received: true, fulfilled: false });
    if (session.metadata?.prodigi_order_id) return NextResponse.json({ received: true, fulfilled: true });
    const d = normalizeDesign(session.metadata);
    const shipping = session.collected_information?.shipping_details;
    const address = shipping?.address;
    if (!shipping?.name || !address?.line1 || !address?.city || !address?.postal_code || address.country !== 'US') throw new Error('Paid order is missing a valid US shipping address.');
    if (!process.env.PRODIGI_API_KEY) throw new Error('Prodigi is not configured.');
    const origin = process.env.SITE_URL || request.nextUrl.origin;
    const base = process.env.PRODIGI_ENV === 'live' ? 'https://api.prodigi.com' : 'https://api.sandbox.prodigi.com';
    const body = {
      merchantReference: sessionId,
      idempotencyKey: crypto.createHash('sha256').update(`our-orbit:${sessionId}`).digest('hex'),
      shippingMethod: 'Budget',
      recipient: {
        name: shipping.name,
        email: session.customer_details?.email || session.customer_email || undefined,
        phoneNumber: session.customer_details?.phone || undefined,
        address: { line1: address.line1, line2: address.line2 || undefined, postalOrZipCode: address.postal_code, countryCode: 'US', townOrCity: address.city, stateOrCounty: address.state || undefined },
      },
      items: [{ sku: 'GLOBAL-TEE-BC-3001', copies: 1, sizing: 'fitPrintArea', attributes: { color: 'black', size: d.size.toLowerCase() }, recipientCost: { amount: '39.00', currency: 'USD' }, assets: [{ printArea: 'front', url: `${origin}/api/print/${sessionId}` }] }],
      metadata: { store: 'Our Orbit', stripeSessionId: sessionId },
    };
    const response = await fetch(`${base}/v4.0/orders`, { method: 'POST', headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.order?.id) throw new Error(`Prodigi order failed: ${response.status} ${JSON.stringify(result).slice(0,500)}`);
    await stripe.checkout.sessions.update(sessionId, { metadata: { ...session.metadata, prodigi_order_id: result.order.id } });
    return NextResponse.json({ received: true, fulfilled: true, orderId: result.order.id });
  } catch (error) {
    console.error('Fulfillment error', error);
    return NextResponse.json({ error: 'Fulfillment failed; Stripe should retry this event.' }, { status: 500 });
  }
}
