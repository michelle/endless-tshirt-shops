// The one place an order is handed to the press. Called by the Stripe webhook,
// and again (harmlessly) by the confirmation page as a safety net if the
// webhook is late or was never wired up.

import type Stripe from 'stripe';
import { stripe, readMeta } from './stripe';
import { createOrder, getOrder, type Address, type ShippingMethod, type ProdigiOrder } from './prodigi';
import { decodeDesign, designErrors } from './design';

export const PRODIGI_ORDER_KEY = 'prodigi_order_id';
export const FULFILMENT_ERROR_KEY = 'fulfilment_error';

export type FulfilResult =
  | { state: 'unpaid' }
  | { state: 'created' | 'existing'; order: ProdigiOrder }
  | { state: 'error'; message: string };

function parseAddress(json: string): Address | null {
  try {
    const a = JSON.parse(json);
    if (!a?.line1 || !a?.countryCode || !a?.name) return null;
    return a as Address;
  } catch {
    return null;
  }
}

/**
 * Idempotent on three levels: we check the session metadata first, we pass the
 * session id to Prodigi as the idempotency key, and Prodigi dedupes on it. A
 * duplicated webhook therefore cannot produce a second shirt.
 */
export async function fulfilSession(sessionId: string): Promise<FulfilResult> {
  const s = stripe();
  const session = await s.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') return { state: 'unpaid' };

  const existingId = readMeta(session.metadata, PRODIGI_ORDER_KEY);
  if (existingId) {
    try {
      return { state: 'existing', order: await getOrder(existingId) };
    } catch {
      return { state: 'existing', order: { id: existingId } };
    }
  }

  const designToken = readMeta(session.metadata, 'design');
  const design = designToken ? decodeDesign(designToken) : null;
  const address = parseAddress(readMeta(session.metadata, 'ship'));
  const assetUrl = readMeta(session.metadata, 'asset');
  const method = (readMeta(session.metadata, 'method') || 'Budget') as ShippingMethod;

  if (!design || designErrors(design).length || !address || !assetUrl) {
    const message = 'Paid order is missing its design or delivery details.';
    await markSession(sessionId, { [FULFILMENT_ERROR_KEY]: message });
    return { state: 'error', message };
  }

  const recipient: Address = {
    ...address,
    email: address.email || session.customer_details?.email || '',
  };

  try {
    const order = await createOrder({
      merchantReference: session.id,
      idempotencyKey: session.id,
      itemReference: `${session.id}-front`,
      recipient,
      shippingMethod: method,
      size: design.sz,
      color: design.col,
      copies: design.q,
      assetUrl,
    });
    await markSession(sessionId, { [PRODIGI_ORDER_KEY]: order.id, [FULFILMENT_ERROR_KEY]: '' });
    return { state: 'created', order };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('prodigi order failed', message);
    await markSession(sessionId, { [FULFILMENT_ERROR_KEY]: message.slice(0, 480) });
    return { state: 'error', message };
  }
}

async function markSession(sessionId: string, metadata: Record<string, string>) {
  try {
    await stripe().checkout.sessions.update(sessionId, { metadata });
  } catch (err) {
    console.error('could not record fulfilment state on session', err);
  }
}

export function sessionSummary(session: Stripe.Checkout.Session) {
  return {
    id: session.id,
    paid: session.payment_status === 'paid',
    amountTotal: session.amount_total ?? 0,
    currency: (session.currency ?? 'usd').toUpperCase(),
    email: session.customer_details?.email ?? null,
    design: readMeta(session.metadata, 'design') || null,
    prodigiOrderId: readMeta(session.metadata, PRODIGI_ORDER_KEY) || null,
    fulfilmentError: readMeta(session.metadata, FULFILMENT_ERROR_KEY) || null,
  };
}
