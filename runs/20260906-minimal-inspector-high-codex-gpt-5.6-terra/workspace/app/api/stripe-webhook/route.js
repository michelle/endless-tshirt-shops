import Stripe from 'stripe';

export const runtime = 'nodejs';

function publicOrigin(request) {
  return (process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`).replace(/\/$/, '');
}

async function createProdigiOrder(session, request) {
  const details = session.collected_information?.shipping_details || session.shipping_details || session.customer_details;
  const address = details?.address || session.customer_details?.address;
  if (!details?.name || !address?.line1 || !address?.city || !address?.postal_code || !address?.country) {
    throw new Error('Stripe did not return a complete shipping address.');
  }
  const timestamp = session.metadata?.timestamp;
  const size = String(session.metadata?.size || 'M').toLowerCase();
  const fit = session.metadata?.fit === 'fitted' ? 'fitted' : 'unisex';
  const baseUrl = (process.env.PRODIGI_API_BASE_URL || 'https://api.sandbox.prodigi.com').replace(/\/$/, '');
  const artworkUrl = `${publicOrigin(request)}/api/artwork?timestamp=${encodeURIComponent(timestamp)}`;
  const payload = {
    merchantReference: `datetime-${session.id}`,
    idempotencyKey: `datetime-${session.id}`,
    shippingMethod: 'Budget',
    recipient: {
      name: details.name,
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: {
        line1: address.line1,
        line2: address.line2 || undefined,
        townOrCity: address.city,
        stateOrCounty: address.state || undefined,
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
      },
    },
    items: [{
      // A crew-neck semi-fitted tee for fitted orders; the original unisex option
      // remains a Bella+Canvas 3001. Both are globally fulfilled DTG products.
      sku: fit === 'fitted' ? 'GLOBAL-TEE-GIL-64000L' : 'GLOBAL-TEE-BC-3001',
      copies: 1,
      sizing: 'fillPrintArea',
      attributes: { color: 'black', size },
      assets: [{ printArea: 'front', url: artworkUrl }],
    }],
    metadata: { stripeCheckoutSessionId: session.id, fit, timestamp },
  };
  const response = await fetch(`${baseUrl}/v4.0/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.PRODIGI_API_KEY },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !['Created', 'OnHold', 'CreatedWithIssues', 'AlreadyExists'].includes(data.outcome)) {
    console.error('Prodigi order failed', response.status, data);
    throw new Error(`Prodigi rejected the order (${response.status}).`);
  }
  return data;
}

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook is not configured.', { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
  }
  if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
    if (!process.env.PRODIGI_API_KEY) return new Response('Prodigi is not configured.', { status: 503 });
    try {
      await createProdigiOrder(event.data.object, request);
    } catch (error) {
      // Return 500 so Stripe retries; idempotencyKey prevents duplicate Prodigi orders.
      console.error('Fulfillment error', error);
      return new Response('Fulfillment failed; retry requested.', { status: 500 });
    }
  }
  return Response.json({ received: true });
}
