const PRODIGI_URL = process.env.PRODIGI_API_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0/orders';
const SKU = 'TEE-AS-5001';

export async function fulfillCheckoutSession(session) {
  if (!process.env.PRODIGI_API_KEY) throw new Error('PRODIGI_API_KEY is not configured');
  const { style = 'fitted', size = 'M', timestamp = String(Date.now()) } = session.metadata || {};
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const artworkUrl = `${origin}/api/artwork?timestamp=${encodeURIComponent(timestamp)}&style=${style}`;
  const shipping = session.shipping_details;
  if (!shipping?.address) throw new Error('Stripe did not return a shipping address');

  const recipient = {
    name: shipping.name || 'datetime customer',
    email: session.customer_details?.email || undefined,
    address: {
      line1: shipping.address.line1,
      line2: shipping.address.line2 || undefined,
      postalOrZipCode: shipping.address.postal_code,
      countryCode: shipping.address.country,
      townOrCity: shipping.address.city,
      stateOrCounty: shipping.address.state || undefined,
    },
  };

  const response = await fetch(PRODIGI_URL, {
    method: 'POST',
    headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantReference: `datetime-${session.id}`,
      idempotencyKey: `datetime-${session.id}`,
      shippingMethod: 'Budget',
      recipient,
      items: [{
        merchantReference: `${style}-${size}`,
        sku: SKU,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { brand: 'AS Colour', edge: 'Crew neck', color: 'white', gender: "Men's", paperType: '100% cotton', size: size.toLowerCase(), style: '5001' },
        recipientCost: { amount: '22.50', currency: 'USD' },
        assets: [{ printArea: 'front', url: artworkUrl }],
      }],
      metadata: { stripeSessionId: session.id, style, size, timestamp },
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.order?.id) {
    console.error('Prodigi order error', payload);
    throw new Error('Prodigi order was not accepted');
  }
  return { orderId: payload.order.id, status: payload.outcome || 'created' };
}
