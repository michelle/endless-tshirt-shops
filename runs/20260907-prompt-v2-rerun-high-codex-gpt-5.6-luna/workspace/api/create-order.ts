const productCatalog = {
  platform: { color: 'black', image: '/products/platform-black.png', name: 'Platform 01' },
  waypoint: { color: 'cream', image: '/products/waypoint-cream.png', name: 'Waypoint 02' },
  afterglow: { color: 'royal blue', image: '/products/afterglow-blue.png', name: 'Afterglow 03' },
} as const;
const allowedSizes = new Set(['S', 'M', 'L', 'XL']);

type VercelRequest = { method?: string; body?: unknown; headers: { host?: string } };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };
type OrderBody = { items?: Array<{ productId?: string; size?: string; quantity?: number }>; recipient?: { name?: string; email?: string; address?: string; city?: string; state?: string; zip?: string; country?: string } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Prodigi sandbox is not configured on this deployment.' });
  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as OrderBody;
  const recipient = body?.recipient;
  if (!recipient?.name || !recipient.email || !recipient.address || !recipient.city || !recipient.zip || !recipient.country) return res.status(400).json({ error: 'Please complete every shipping field.' });
  const items = body.items?.filter((item) => item.productId && item.size && item.quantity) ?? [];
  if (!items.length || items.length > 10) return res.status(400).json({ error: 'Your bag is empty or too large.' });
  const invalidItem = items.find((item) => !productCatalog[item.productId as keyof typeof productCatalog] || !allowedSizes.has(item.size as string) || !Number.isInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 5);
  if (invalidItem) return res.status(400).json({ error: 'One of the selected items is not available.' });
  const baseUrl = `https://${req.headers.host}`;
  const orderItems = items.map((item) => { const product = productCatalog[item.productId as keyof typeof productCatalog]; return { merchantReference: `${product.name}-${item.size}`, sku: 'GLOBAL-TEE-BC-3001', copies: item.quantity, sizing: 'fitPrintArea', attributes: { brand: 'Bella + Canvas', edge: 'Crew neck', color: product.color, gender: 'Unisex', paperType: '100% cotton', size: String(item.size).toLowerCase(), style: '3001' }, assets: [{ printArea: 'front', url: `${baseUrl}${product.image}` }] }; });
  const prodigiResponse = await fetch('https://api.sandbox.prodigi.com/v4.0/Orders', { method: 'POST', headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ merchantReference: `NMS-${Date.now().toString(36).toUpperCase()}`, shippingMethod: 'Budget', recipient: { name: recipient.name, email: recipient.email, address: { line1: recipient.address, postalOrZipCode: recipient.zip, countryCode: recipient.country, townOrCity: recipient.city, stateOrCounty: recipient.state || null } }, items: orderItems, metadata: { source: 'night-market-signal', environment: 'sandbox' } }) });
  const result = (await prodigiResponse.json().catch(() => ({}))) as { outcome?: string; order?: { id?: string }; issues?: Array<{ description?: string }> };
  if (!prodigiResponse.ok || !result?.order?.id) return res.status(502).json({ error: result?.issues?.[0]?.description || 'Prodigi could not validate that order.' });
  return res.status(200).json({ orderId: result.order.id, outcome: result.outcome ?? 'Created' });
}
