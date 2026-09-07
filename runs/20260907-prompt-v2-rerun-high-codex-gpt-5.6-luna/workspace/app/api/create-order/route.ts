import { NextResponse } from 'next/server';

const productCatalog = {
  platform: { color: 'black', image: '/products/platform-black.png', name: 'Platform 01' },
  waypoint: { color: 'cream', image: '/products/waypoint-cream.png', name: 'Waypoint 02' },
  afterglow: { color: 'royal blue', image: '/products/afterglow-blue.png', name: 'Afterglow 03' },
} as const;
const allowedSizes = new Set(['S', 'M', 'L', 'XL']);
type OrderRequest = { items?: Array<{ productId?: string; size?: string; quantity?: number }>; recipient?: { name?: string; email?: string; address?: string; city?: string; state?: string; zip?: string; country?: string } };

export async function POST(request: Request) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Prodigi sandbox is not configured on this deployment.' }, { status: 503 });
  let body: OrderRequest;
  try { body = (await request.json()) as OrderRequest; } catch { return NextResponse.json({ error: 'Please send a valid order.' }, { status: 400 }); }
  const recipient = body.recipient;
  if (!recipient?.name || !recipient.email || !recipient.address || !recipient.city || !recipient.zip || !recipient.country) return NextResponse.json({ error: 'Please complete every shipping field.' }, { status: 400 });
  const items = body.items?.filter((item) => item.productId && item.size && item.quantity) ?? [];
  if (!items.length || items.length > 10) return NextResponse.json({ error: 'Your bag is empty or too large.' }, { status: 400 });
  const invalidItem = items.find((item) => !productCatalog[item.productId as keyof typeof productCatalog] || !allowedSizes.has(item.size as string) || !Number.isInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 5);
  if (invalidItem) return NextResponse.json({ error: 'One of the selected items is not available.' }, { status: 400 });
  const baseUrl = new URL(request.url).origin;
  const orderItems = items.map((item) => { const product = productCatalog[item.productId as keyof typeof productCatalog]; return { merchantReference: `${product.name}-${item.size}`, sku: 'GLOBAL-TEE-BC-3001', copies: item.quantity, sizing: 'fitPrintArea', attributes: { brand: 'Bella + Canvas', edge: 'Crew neck', color: product.color, gender: 'Unisex', paperType: '100% cotton', size: String(item.size).toLowerCase(), style: '3001' }, assets: [{ printArea: 'front', url: `${baseUrl}${product.image}` }] }; });
  const prodigiResponse = await fetch('https://api.sandbox.prodigi.com/v4.0/Orders', { method: 'POST', headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ merchantReference: `NMS-${Date.now().toString(36).toUpperCase()}`, shippingMethod: 'Budget', recipient: { name: recipient.name, email: recipient.email, address: { line1: recipient.address, postalOrZipCode: recipient.zip, countryCode: recipient.country, townOrCity: recipient.city, stateOrCounty: recipient.state || null } }, items: orderItems, metadata: { source: 'night-market-signal', environment: 'sandbox' } }) });
  const result = (await prodigiResponse.json().catch(() => ({}))) as { outcome?: string; order?: { id?: string }; issues?: Array<{ description?: string }> };
  if (!prodigiResponse.ok || !result.order?.id) return NextResponse.json({ error: result.issues?.[0]?.description || 'Prodigi could not validate that order.' }, { status: 502 });
  return NextResponse.json({ orderId: result.order.id, outcome: result.outcome ?? 'Created' });
}
