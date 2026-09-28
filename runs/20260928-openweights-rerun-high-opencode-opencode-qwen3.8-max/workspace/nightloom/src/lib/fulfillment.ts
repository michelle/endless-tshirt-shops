// Fulfilment: called ONLY after a payment has been confirmed (Stripe webhook
// with payment_status === 'paid', or the sandbox-mode test payment endpoint
// when Stripe is not configured). Renders the print file URL and submits the
// order to Prodigi, which prints and ships the shirt to the customer.

import { pack, sign } from './encoding';
import { createProdigiOrder, type ProdigiOrderResponse } from './prodigi';
import { appUrl } from './stripe';
import type { DesignParams, OrderPayload } from './types';

/** Public, signed, deterministic URL of the print-ready PNG for a design. */
export function artworkUrl(design: DesignParams): string {
  const d = pack(design);
  const sig = sign(d);
  return `${appUrl()}/api/artwork?d=${d}&sig=${sig}`;
}

export interface FulfillResult {
  outcome: string;
  prodigiOrderId: string | null;
  stage: string | null;
  raw: ProdigiOrderResponse;
}

export async function fulfillPaidOrder(order: OrderPayload): Promise<FulfillResult> {
  const assetUrl = artworkUrl(order.design);
  console.log(
    `[nightloom] fulfilling ${order.orderRef} (attempt ${order.attemptId}) asset=${assetUrl.slice(0, 120)}…`
  );
  const res = await createProdigiOrder(order, assetUrl);
  const outcome = String(res.outcome ?? 'unknown');
  const okOutcomes = ['Created', 'OnHold', 'AlreadyExists'];
  if (!okOutcomes.includes(outcome) && outcome.toLowerCase() !== 'createdwithissues') {
    throw new Error(`Prodigi order creation failed: ${outcome} ${JSON.stringify(res.errors ?? '')}`);
  }
  if (outcome.toLowerCase() === 'createdwithissues') {
    console.error(`[nightloom] ${order.orderRef} created WITH ISSUES`, JSON.stringify(res.order?.status?.issues ?? []));
  }
  console.log(
    `[nightloom] ${order.orderRef} -> Prodigi ${res.order?.id ?? '?'} outcome=${outcome} stage=${res.order?.status?.stage ?? '?'}`
  );
  return {
    outcome,
    prodigiOrderId: res.order?.id ?? null,
    stage: res.order?.status?.stage ?? null,
    raw: res,
  };
}
