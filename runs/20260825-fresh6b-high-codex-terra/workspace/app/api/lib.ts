import Stripe from 'stripe';

export const PRICE_CENTS = 2250;
export const PRODUCT_NAME = 'datetime.store timestamp tee';

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured yet.');
  return new Stripe(key);
}

export function isSelection(value: unknown): value is { style: 'fitted' | 'unisex'; size: string; timestamp: number } {
  return !!value && typeof value === 'object' && ['fitted', 'unisex'].includes((value as {style?: string}).style || '') && ['S','M','L','XL','2XL'].includes((value as {size?: string}).size || '') && Number.isInteger((value as {timestamp?: number}).timestamp) && (value as {timestamp: number}).timestamp > 1700000000000;
}

export function originFromRequest(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

type CheckoutData = { timestamp: string; style: string; size: string; artworkUrl: string };
export function checkoutData(session: Stripe.Checkout.Session): CheckoutData {
  const metadata = session.metadata || {};
  const timestamp = metadata.timestamp;
  const style = metadata.style;
  const size = metadata.size;
  const artworkUrl = metadata.artworkUrl;
  if (!timestamp || !style || !size || !artworkUrl) throw new Error('The purchase record is missing print details.');
  return { timestamp, style, size, artworkUrl };
}

export async function submitProdigiOrder(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') throw new Error('Payment has not completed.');
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('Prodigi is not configured yet.');
  const shipping = session.collected_information?.shipping_details;
  if (!shipping?.address || !shipping.name) throw new Error('A shipping address is required before production can begin.');
  const data = checkoutData(session);
  const shirtSku = process.env.PRODIGI_TSHIRT_SKU;
  if (!shirtSku) throw new Error('Prodigi garment SKU is not configured.');
  const printArea = process.env.PRODIGI_TSHIRT_PRINT_AREA || 'center_chest';
  let attributes: Record<string, string> = { colour: 'black', size: data.size.toLowerCase(), fit: data.style };
  if (process.env.PRODIGI_TSHIRT_ATTRIBUTES) {
    try { attributes = JSON.parse(process.env.PRODIGI_TSHIRT_ATTRIBUTES); }
    catch { throw new Error('PRODIGI_TSHIRT_ATTRIBUTES must be valid JSON.'); }
  }
  const payload = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name: shipping.name,
      email: session.customer_details?.email || undefined,
      address: {
        line1: shipping.address.line1,
        line2: shipping.address.line2 || undefined,
        townOrCity: shipping.address.city || undefined,
        stateOrCounty: shipping.address.state || undefined,
        postalOrZipCode: shipping.address.postal_code || undefined,
        countryCode: shipping.address.country || 'US',
      },
    },
    items: [{
      merchantReference: `${session.id}-shirt`,
      sku: shirtSku,
      copies: 1,
      // This is Prodigi's image-resizing mode; garment size belongs in attributes.
      sizing: 'fillPrintArea',
      attributes,
      assets: [{ printArea, url: data.artworkUrl }],
    }],
    metadata: { stripeCheckoutSessionId: session.id, timestamp: data.timestamp, style: data.style, size: data.size },
  };
  const base = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0';
  const response = await fetch(`${base}/Orders`, { method: 'POST', headers: {'Content-Type': 'application/json', 'X-API-Key': key}, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !['Created', 'CreatedWithIssues', 'AlreadyExists', 'created', 'createdWithIssues', 'alreadyExists'].includes(body.outcome)) {
    throw new Error(body?.error?.message || body?.message || 'Prodigi could not accept this order.');
  }
  return body;
}
