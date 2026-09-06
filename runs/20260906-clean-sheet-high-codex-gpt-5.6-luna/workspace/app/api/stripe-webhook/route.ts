import { NextResponse } from 'next/server';

const encoder = new TextEncoder();
function hex(buffer: ArrayBuffer) { return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
async function validSignature(payload: string, signature: string, secret: string) {
  const pieces = signature.split(',').reduce<Record<string, string[]>>((acc, part) => { const [key, value] = part.split('='); if (key && value) (acc[key] ??= []).push(value); return acc; }, {});
  const timestamp = pieces.t?.[0]; const signatures = pieces.v1 ?? [];
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`)));
  return signatures.some((candidate) => candidate === digest);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prodigiKey = process.env.PRODIGI_API_KEY;
  if (!webhookSecret || !prodigiKey) return NextResponse.json({ error: 'Webhook fulfillment is not configured.' }, { status: 503 });
  const payload = await request.text();
  if (!(await validSignature(payload, request.headers.get('stripe-signature') || '', webhookSecret))) return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  try {
    const event = JSON.parse(payload) as { type?: string; data?: { object?: { id?: string; metadata?: { order_items?: string }; customer_details?: { email?: string; name?: string }; shipping_details?: { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } } } } };
    if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });
    const session = event.data?.object;
    const item = session?.metadata?.order_items ? JSON.parse(session.metadata.order_items) as { color: string; size: string; quantity: number } : null;
    const destination = session?.shipping_details?.address;
    if (!session?.id || !item || !destination?.line1 || !destination.country || !destination.postal_code || !destination.city) return NextResponse.json({ error: 'Order metadata or shipping address missing.' }, { status: 400 });
    const origin = new URL(request.url).origin;
    const order = {
      merchantReference: `nsc-${session.id}`, idempotencyKey: session.id, shippingMethod: 'Budget',
      recipient: {
        name: session.shipping_details?.name || session.customer_details?.name || 'Night Shift Club customer',
        email: session.customer_details?.email,
        address: { line1: destination.line1, line2: destination.line2 || null, townOrCity: destination.city, stateOrCounty: destination.state || null, postalOrZipCode: destination.postal_code, countryCode: destination.country },
      },
      items: [{ merchantReference: 'timestamp-tee', sku: 'TEE-GIL-64000', copies: item.quantity, sizing: 'fitPrintArea', attributes: { brand: 'Gildan', edge: 'Crew neck', color: item.color, gender: 'Unisex', size: item.size.toLowerCase(), style: '64000' }, assets: [{ printArea: 'front', url: `${origin}/assets/timestamp-print.png` }] }],
      metadata: { stripeSessionId: session.id, store: 'night-shift-club' },
    };
    const prodigiResponse = await fetch('https://api.sandbox.prodigi.com/v4.0/Orders', { method: 'POST', headers: { 'X-API-Key': prodigiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    const prodigiResult = await prodigiResponse.json() as { outcome?: string; order?: { id?: string } };
    if (!prodigiResponse.ok || !prodigiResult.order?.id) { console.error('Prodigi order creation failed', prodigiResult); return NextResponse.json({ error: 'Prodigi order creation failed.' }, { status: 502 }); }
    console.log('Prodigi sandbox order created', { stripeSessionId: session.id, prodigiOrderId: prodigiResult.order.id });
    return NextResponse.json({ received: true, prodigiOrderId: prodigiResult.order.id });
  } catch (error) {
    console.error('Webhook handling failed', error);
    return NextResponse.json({ error: 'Webhook handling failed.' }, { status: 500 });
  }
}
