import { NextResponse } from 'next/server';

const PRODIGI_BASE_URL = process.env.PRODIGI_ENVIRONMENT === 'live' ? 'https://api.prodigi.com/v4.0' : 'https://api.sandbox.prodigi.com/v4.0';
type OrderPayload = { customer: { name: string; email: string; phoneNumber?: string }; address: { line1: string; line2?: string; townOrCity: string; stateOrCounty?: string; postalOrZipCode: string; countryCode: string }; items: Array<{ sku: string; size: string; color: string; prodigiColor?: string; quantity: number }> };

export async function POST(request: Request) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Prodigi is not configured yet.' }, { status: 503 });
  let payload: OrderPayload;
  try { payload = await request.json() as OrderPayload; } catch { return NextResponse.json({ error: 'Invalid order payload.' }, { status: 400 }); }
  if (!payload.customer?.name || !payload.customer?.email || !payload.address?.line1 || !payload.address?.townOrCity || !payload.address?.postalOrZipCode || !payload.items?.length) return NextResponse.json({ error: 'Please provide contact, shipping, and item details.' }, { status: 400 });
  const origin = new URL(request.url).origin;
  const items = payload.items.map((item) => ({ sku: item.sku || 'TEE-AS-5001', copies: Math.max(1, Math.min(10, Number(item.quantity) || 1)), sizing: 'fillPrintArea', attributes: { color: item.prodigiColor || item.color || 'black', size: (item.size || 'M').toLowerCase() }, assets: [{ printArea: 'front', url: `${origin}/images/signal-tee.png` }] }));
  const order = { merchantReference: `nightshift-${Date.now()}`, idempotencyKey: `nightshift-${crypto.randomUUID()}`, shippingMethod: 'Standard', recipient: { name: payload.customer.name, email: payload.customer.email, phoneNumber: payload.customer.phoneNumber || null, address: payload.address }, items, metadata: { storefront: 'nightshift-supply', environment: process.env.PRODIGI_ENVIRONMENT || 'sandbox' } };
  try {
    const response = await fetch(`${PRODIGI_BASE_URL}/Orders`, { method: 'POST', headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    const data = await response.json().catch(() => ({} as any)) as any;
    const accepted = ['Created', 'created', 'OnHold', 'onHold', 'AlreadyExists', 'alreadyExists'];
    if (!response.ok || (data.outcome && !accepted.includes(data.outcome))) return NextResponse.json({ error: data.message || data.error?.message || 'Prodigi rejected the order.', details: data }, { status: 502 });
    return NextResponse.json({ orderId: data.order?.id || data.id || 'sandbox-order', outcome: data.outcome || 'Created' });
  } catch { return NextResponse.json({ error: 'Prodigi is temporarily unreachable.' }, { status: 502 }); }
}
