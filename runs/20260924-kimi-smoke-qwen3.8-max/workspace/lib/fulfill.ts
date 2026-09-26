/**
 * Fulfilment: the ONLY code path that talks to Prodigi.
 *
 * Invariant: this is called strictly after a payment has succeeded —
 * either from the Stripe webhook (checkout.session.completed) or from the
 * sandbox TestPay confirmation. Prodigi's idempotencyKey (= our orderId)
 * guarantees that replays never create a second print order.
 */
import type { OrderPayload } from './orders';
import { createProdigiOrder, serverBaseUrl, type ProdigiResult } from './prodigi';
import { encodeDesign } from './design';

export function artworkPrintUrl(order: OrderPayload): string {
  const d = encodeDesign(order.design);
  return `${serverBaseUrl()}/api/render?d=${d}&w=2490`;
}

export async function fulfillOrder(order: OrderPayload): Promise<ProdigiResult> {
  const result = await createProdigiOrder(order, artworkPrintUrl(order));
  console.log(
    JSON.stringify({
      event: 'fulfillment',
      orderId: order.orderId,
      provider: order.payment.provider,
      ok: result.ok,
      outcome: result.outcome,
      prodigiOrderId: result.prodigiOrderId,
      error: result.error,
      issues: result.issues,
    }),
  );
  return result;
}
