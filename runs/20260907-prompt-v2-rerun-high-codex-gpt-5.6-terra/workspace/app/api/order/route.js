import { NextResponse } from 'next/server';

const allowedSizes = new Set(['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl']);
const allowedColors = new Set(['black', 'navy blue', 'natural']);

function clean(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request) {
  try {
    const body = await request.json();
    const customer = body.customer || {};
    const cart = Array.isArray(body.cart) ? body.cart : [];
    const name = clean(customer.name);
    const email = clean(customer.email);
    const line1 = clean(customer.line1);
    const city = clean(customer.city);
    const region = clean(customer.region);
    const postalCode = clean(customer.postalCode, 24);
    const countryCode = clean(customer.countryCode, 2).toUpperCase();

    if (!name || !email || !line1 || !city || !postalCode || !/^[A-Z]{2}$/.test(countryCode) || cart.length < 1) {
      return NextResponse.json({ error: 'Please complete your contact details, shipping address, and cart.' }, { status: 400 });
    }

    const artworkUrl = process.env.PRODIGI_ARTWORK_URL || `${new URL(request.url).origin}/art/night-shift-atlas.png`;
    const items = cart.map((item, index) => {
      const size = clean(item.size, 8).toLowerCase();
      const color = clean(item.color, 24).toLowerCase();
      const quantity = Math.min(Math.max(Number(item.quantity) || 1, 1), 5);
      if (!allowedSizes.has(size) || !allowedColors.has(color)) throw new Error('An item has an unsupported size or color.');
      return {
        merchantReference: `night-shift-${index + 1}`,
        sku: 'GLOBAL-TEE-BC-3001',
        copies: quantity,
        sizing: 'fillPrintArea',
        attributes: { size, color },
        assets: [{ printArea: 'front', url: artworkUrl }],
        recipientCost: { amount: (38 * quantity).toFixed(2), currency: 'USD' }
      };
    });

    const apiKey = process.env.PRODIGI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Fulfilment is not configured yet.' }, { status: 503 });

    const prodigiResponse = await fetch('https://api.sandbox.prodigi.com/v4.0/Orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        merchantReference: `nsa-${Date.now()}`,
        idempotencyKey: crypto.randomUUID(),
        shippingMethod: 'Standard',
        recipient: {
          name,
          email,
          address: { line1, postalOrZipCode: postalCode, countryCode, townOrCity: city, stateOrCounty: region || null }
        },
        items,
        metadata: { store: 'night-shift-atlas', environment: 'sandbox' }
      })
    });
    const result = await prodigiResponse.json().catch(() => ({}));
    if (!prodigiResponse.ok || !['Created', 'OnHold', 'CreatedWithIssues', 'created', 'onHold', 'createdWithIssues'].includes(result.outcome)) {
      return NextResponse.json({ error: result.error?.message || result.message || 'Prodigi could not create this order.', details: result }, { status: 502 });
    }
    return NextResponse.json({ orderId: result.order?.id || result.id, outcome: result.outcome, status: result.order?.status?.stage });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected checkout error.' }, { status: 400 });
  }
}
