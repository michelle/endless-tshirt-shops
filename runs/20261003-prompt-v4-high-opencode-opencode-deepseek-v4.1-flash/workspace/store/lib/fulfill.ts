// Order fulfilment: after a Stripe payment is confirmed, place the order with
// Prodigi. Safe to call repeatedly — Prodigi de-duplicates on idempotencyKey.
import type Stripe from 'stripe';
import { getStripe } from './stripe';
import { createProdigiOrder, type ProdigiOrderRequest } from './prodigi';
import { verifyToken } from './design-token';
import { BASE_PRICE_CENTS, getShirt, getSize, PRODIGI_SKU } from './theme';

export type FulfillState = 'unpaid' | 'fulfilled' | 'already' | 'error';

export type FulfillResult = {
  state: FulfillState;
  orderId?: string;
  prodigiStage?: string;
  designUrl?: string;
  designToken?: string;
  priceCents?: number;
  sizeName?: string;
  shirtName?: string;
  message?: string;
};

async function warmAsset(url: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);
    await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
  } catch (err) {
    console.warn('design warm-up skipped:', (err as Error).message);
  }
}

function pickShipping(session: Stripe.Checkout.Session) {
  const anySession = session as unknown as {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    collected_information?: { shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null };
  };
  return (
    anySession.shipping_details ||
    anySession.collected_information?.shipping_details ||
    null
  );
}

export async function fulfillCheckoutSession(sessionId: string, origin: string): Promise<FulfillResult> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return { state: 'unpaid', message: `Payment status is "${session.payment_status}".` };
  }

  const meta = (session.metadata || {}) as Record<string, string>;
  const designToken = meta.design;
  const params = verifyToken(designToken);
  if (!params) {
    return { state: 'error', message: 'The design signature is missing or invalid.' };
  }

  const size = getSize(meta.size || 'l');
  const shirt = getShirt(params.shirt);
  const priceCents = BASE_PRICE_CENTS + size.surcharge;
  const designUrl = `${origin}/api/design?t=${encodeURIComponent(designToken!)}`;

  // Warm the renderer/CDN so Prodigi's asset download is fast (and reliable).
  // This is a no-op cache hit if the browser already pre-warmed the design.
  await warmAsset(designUrl);

  const shipping = pickShipping(session);
  const address = shipping?.address || session.customer_details?.address;
  const name = shipping?.name || session.customer_details?.name || 'Customer';
  if (!address || !address.line1) {
    return { state: 'error', message: 'No shipping address was provided with the payment.' };
  }

  const payload: ProdigiOrderRequest = {
    merchantReference: `RESONA-${session.id.slice(-10)}`,
    idempotencyKey: `stripe-${session.id}`,
    shippingMethod: 'Standard',
    recipient: {
      name,
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: {
        line1: address.line1,
        line2: address.line2 || undefined,
        postalOrZipCode: address.postal_code || '',
        countryCode: address.country || 'US',
        townOrCity: address.city || '',
        stateOrCounty: address.state || undefined,
      },
    },
    items: [
      {
        merchantReference: `tee-${size.id}-${params.palette}`,
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { color: shirt.id, size: size.prodigiSize },
        recipientCost: { amount: (priceCents / 100).toFixed(2), currency: 'USD' },
        assets: [{ printArea: 'front', url: designUrl }],
      },
    ],
    metadata: {
      stripeSession: session.id,
      design: designToken,
      palette: params.palette,
      style: params.style,
      name: params.name,
    },
  };

  const res = await createProdigiOrder(payload);
  if (!res.ok || !res.data) {
    return {
      state: 'error',
      message: res.data?.message || `Prodigi rejected the order (HTTP ${res.status}).`,
      designUrl,
    };
  }

  const outcome = (res.data.outcome || '').toLowerCase();
  if (outcome === 'createdwithissues') {
    return {
      state: 'fulfilled',
      orderId: res.data.order?.id,
      prodigiStage: res.data.order?.status?.stage,
      designUrl,
      designToken,
      priceCents,
      sizeName: size.name,
      shirtName: shirt.name,
      message: 'The order was created but Prodigi reported an issue with the artwork. Our team will review it.',
    };
  }
  return {
    state: outcome === 'alreadyexists' ? 'already' : 'fulfilled',
    orderId: res.data.order?.id,
    prodigiStage: res.data.order?.status?.stage,
    designUrl,
    designToken,
    priceCents,
    sizeName: size.name,
    shirtName: shirt.name,
  };
}
