// Order fulfillment: called only after Stripe confirms payment. Turns the order
// payload stored in Checkout Session metadata into a Prodigi order.
//
// Idempotency is layered:
//   1. Stripe session metadata flag `fulfilled` set after a successful submit.
//   2. Prodigi `idempotencyKey` = Stripe session id, so even a concurrent double
//      submit collapses into one Prodigi order.
import { decodeDesign } from './design';
import { PRICE_CENTS, PRODIGI_SKU, SIZES, inkById, shirtById } from './shirts';
import {
  appBaseUrl,
  designAssetUrl,
  prodigiCreateOrder,
  stripeApi,
  type ProdigiOrderResult,
} from './server';

export interface FulfillResult {
  state: 'fulfilled' | 'awaiting_payment' | 'not_ours' | 'invalid' | 'error';
  /** true when retrying could help (network/5xx); false for deterministic failures */
  transient?: boolean;
  prodigiOrderId?: string;
  prodigiStage?: string;
  error?: string;
}

interface SessionShape {
  id: string;
  payment_status?: string;
  metadata?: Record<string, string>;
  amount_total?: number;
  customer_details?: { email?: string };
}

export async function getSession(sessionId: string): Promise<SessionShape> {
  return stripeApi<SessionShape>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export async function fulfillStripeSession(sessionId: string): Promise<FulfillResult> {
  let session: SessionShape;
  try {
    session = await getSession(sessionId);
  } catch (e) {
    return { state: 'error', transient: true, error: `could not load checkout session: ${(e as Error).message}` };
  }

  const md = session.metadata || {};

  // This Stripe account may receive events for sessions created elsewhere.
  // Sessions that did not come from our /api/checkout have no version tag.
  if (md.v !== '1') {
    return { state: 'not_ours' };
  }

  if (session.payment_status !== 'paid') {
    return { state: 'awaiting_payment' };
  }

  if (md.fulfilled === '1' && md.oid) {
    return { state: 'fulfilled', prodigiOrderId: md.oid };
  }

  // --- rebuild the order from metadata ---
  const design = md.d ? decodeDesign(md.d) : null;
  if (!design) return { state: 'invalid', error: 'missing or invalid design payload' };
  const shirt = md.color ? shirtById(md.color) : undefined;
  const ink = md.ink ? inkById(md.ink) : undefined;
  const size = (md.size || '').toLowerCase();
  if (!shirt || !ink || !(SIZES as readonly string[]).includes(size)) {
    return { state: 'invalid', error: 'missing or invalid garment selection' };
  }
  const qty = Math.max(1, Math.min(5, parseInt(md.qty || '1', 10) || 1));

  const recipient = {
    name: md.r_name || '',
    email: md.r_email || session.customer_details?.email || undefined,
    address: {
      line1: md.r_l1 || '',
      line2: md.r_l2 || undefined,
      townOrCity: md.r_city || '',
      stateOrCounty: md.r_state || undefined,
      postalOrZipCode: md.r_zip || '',
      countryCode: (md.r_cc || '').toUpperCase(),
    },
  };
  if (!recipient.name || !recipient.address.line1 || !recipient.address.townOrCity ||
      !recipient.address.postalOrZipCode || recipient.address.countryCode.length !== 2) {
    return { state: 'invalid', error: 'incomplete shipping address' };
  }

  const assetUrl = designAssetUrl(design, ink.id);
  const payload = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    callbackUrl: `${appBaseUrl()}/api/prodigi/callback`,
    recipient,
    items: [
      {
        merchantReference: 'tee-1',
        sku: PRODIGI_SKU,
        copies: qty,
        sizing: 'fillPrintArea',
        attributes: { color: shirt.id, size },
        assets: [{ printArea: 'front', url: assetUrl }],
        recipientCost: {
          amount: ((PRICE_CENTS * qty) / 100).toFixed(2),
          currency: 'USD',
        },
      },
    ],
    metadata: { source: 'sidereal-shop', design: md.d, ink: ink.id },
  };

  let result: ProdigiOrderResult;
  try {
    result = await prodigiCreateOrder(payload);
  } catch (e) {
    return { state: 'error', transient: true, error: `Prodigi rejected the order: ${(e as Error).message}` };
  }

  const oid = result.order?.id;
  if (!oid) {
    return { state: 'error', transient: false, error: `unexpected Prodigi outcome: ${result.outcome}` };
  }

  try {
    await stripeApi(`/checkout/sessions/${encodeURIComponent(session.id)}`, 'POST', {
      'metadata[fulfilled]': '1',
      'metadata[oid]': oid,
    });
  } catch {
    // Non-fatal: Prodigi's idempotency key still protects us from duplicates.
  }

  return { state: 'fulfilled', prodigiOrderId: oid, prodigiStage: result.order?.status?.stage };
}
