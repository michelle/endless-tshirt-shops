import { NextRequest, NextResponse } from 'next/server';
import { COLORS, PRODUCTS, SIZES } from '@/lib/products';

export const runtime = 'nodejs';

type IncomingItem = { productId?: string; size?: string; color?: string; quantity?: number };
type IncomingCustomer = { name?: string; email?: string; line1?: string; city?: string; state?: string; postalCode?: string; countryCode?: string };

const clean = (value: unknown, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function POST(request: NextRequest) {
  if (!process.env.PRODIGI_API_KEY) return NextResponse.json({ error: 'Sandbox fulfillment is not configured.' }, { status: 503 });
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 20_000) return NextResponse.json({ error: 'Order data is too large.' }, { status: 413 });

  let input: { customer?: IncomingCustomer; items?: IncomingItem[] };
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Order data is not valid JSON.' }, { status: 400 }); }

  const customer = input.customer ?? {};
  const name = clean(customer.name);
  const email = clean(customer.email);
  const line1 = clean(customer.line1);
  const city = clean(customer.city);
  const state = clean(customer.state);
  const postalCode = clean(customer.postalCode, 30);
  const countryCode = clean(customer.countryCode || 'US', 2).toUpperCase();
  if (!name || !email.includes('@') || !line1 || !city || !postalCode || !/^[A-Z]{2}$/.test(countryCode)) return NextResponse.json({ error: 'Complete the shipping details and try again.' }, { status: 400 });
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 12) return NextResponse.json({ error: 'Your bag must contain between 1 and 12 items.' }, { status: 400 });

  const projectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : request.nextUrl.origin;
  if (!projectUrl.startsWith('https://')) return NextResponse.json({ error: 'Create sandbox orders from the deployed store so Prodigi can access the artwork.' }, { status: 400 });

  const items = [];
  for (const [index, item] of input.items.entries()) {
    const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
    const quantity = Number(item.quantity);
    if (!product || !SIZES.includes(item.size as never) || !COLORS.some((candidate) => candidate.value === item.color) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return NextResponse.json({ error: 'One of the shirt options is unavailable.' }, { status: 400 });
    items.push({
      merchantReference: `${product.id}-${index + 1}`,
      sku: 'GLOBAL-TEE-BC-3001',
      copies: quantity,
      sizing: 'fitPrintArea',
      attributes: { color: item.color, size: item.size },
      assets: [{ printArea: 'front', url: new URL(product.asset, projectUrl).toString() }],
    });
  }

  const idempotencyKey = crypto.randomUUID();
  const baseUrl = process.env.PRODIGI_API_BASE_URL === 'https://api.prodigi.com' && process.env.ENABLE_LIVE_FULFILLMENT === 'true' ? 'https://api.prodigi.com' : 'https://api.sandbox.prodigi.com';
  const payload = {
    merchantReference: `NSFC-${idempotencyKey.slice(0, 8).toUpperCase()}`,
    shippingMethod: 'Budget', idempotencyKey,
    recipient: { name, email, address: { line1, postalOrZipCode: postalCode, countryCode, townOrCity: city, stateOrCounty: state || null } },
    items,
    metadata: { storefront: 'Night Shift Field Club', mode: baseUrl.includes('sandbox') ? 'sandbox' : 'live' },
  };

  try {
    const response = await fetch(`${baseUrl}/v4.0/orders`, { method: 'POST', headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
    const result = await response.json() as { outcome?: string; order?: { id?: string; status?: { issues?: Array<{ description?: string }> } }; id?: string };
    const orderId = result.order?.id || result.id;
    if (!response.ok || !orderId) return NextResponse.json({ error: result.order?.status?.issues?.[0]?.description || 'Prodigi could not create this sandbox order.' }, { status: response.status >= 400 && response.status < 500 ? 400 : 502 });
    return NextResponse.json({ orderId, outcome: result.outcome || 'Created', sandbox: baseUrl.includes('sandbox') });
  } catch {
    return NextResponse.json({ error: 'Prodigi is temporarily unavailable. Please try again.' }, { status: 502 });
  }
}
