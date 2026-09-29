import { stripe } from './stripe';
import { createOrder } from './prodigi';
import { DesignInput, encodeDesign, validateDesign, ValidationError } from './design';
import { SHIRT_SKU, SHIRT_PRICE_CENTS, CURRENCY, getColor } from './catalog';

/**
 * Fulfilment is strictly payment-gated: a Prodigi order is only ever created
 * when Stripe reports the Checkout Session as `paid`. The session's own
 * metadata is the state store — `prodigiOrderId` marks it fulfilled — and
 * Prodigi's idempotencyKey (the session id) is the second line of defence if
 * the return-URL path and the webhook race each other.
 */

export type FulfillResult = {
  state: 'unpaid' | 'fulfilled' | 'already' | 'failed';
  prodigiOrderId?: string;
  prodigiOutcome?: string;
  prodigiStage?: string;
  error?: string;
  display: {
    design: DesignInput | null;
    color: string | null;
    size: string | null;
    qty: number;
    email: string | null;
    name: string | null;
    amountTotal: string | null;
    shipping: {
      name: string | null;
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
    } | null;
  };
};

const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]+$/;

export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value) && value.length <= 256;
}

export async function fulfillSession(sessionId: string, base: string): Promise<FulfillResult> {
  if (!isSessionId(sessionId)) throw new ValidationError('invalid session id');
  const session = await stripe().checkout.sessions.retrieve(sessionId);

  const meta = session.metadata ?? {};
  const display: FulfillResult['display'] = {
    design: null,
    color: null,
    size: null,
    qty: Number(meta.qty ?? 1),
    email: session.customer_details?.email ?? null,
    name: session.customer_details?.name ?? null,
    amountTotal:
      typeof session.amount_total === 'number'
        ? `$${(session.amount_total / 100).toFixed(2)}`
        : null,
    shipping: null,
  };

  let design: DesignInput;
  try {
    design = validateDesign(JSON.parse(meta.designJson ?? 'null'));
    display.design = design;
  } catch {
    return { state: 'failed', display, error: 'This payment does not carry a Moonworn design.' };
  }
  display.color = meta.color ?? null;
  display.size = meta.size ?? null;

  // Basil-era API: collected_information.shipping_details. Older API versions
  // used shipping_address_details — read whichever is present.
  type ShipDetails = {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  };
  const s = session as unknown as {
    collected_information?: { shipping_details?: ShipDetails | null } | null;
    shipping_address_details?: ShipDetails | null;
  };
  const ship = s.collected_information?.shipping_details ?? s.shipping_address_details ?? null;
  if (ship) {
    display.shipping = {
      name: ship.name ?? null,
      line1: ship.address?.line1 ?? null,
      line2: ship.address?.line2 ?? null,
      city: ship.address?.city ?? null,
      state: ship.address?.state ?? null,
      postalCode: ship.address?.postal_code ?? null,
      country: ship.address?.country ?? null,
    };
  }

  // ---- Gate: nothing is sent to Prodigi unless payment succeeded. ----
  if (session.payment_status !== 'paid') {
    return { state: 'unpaid', display };
  }
  if (meta.prodigiOrderId) {
    return { state: 'already', prodigiOrderId: meta.prodigiOrderId, display };
  }
  if (!ship?.address) {
    return { state: 'failed', display, error: 'Payment succeeded but no shipping address was collected.' };
  }

  const { d, sig } = encodeDesign(design);
  const assetUrl = `${base}/api/design?d=${d}&sig=${sig}&r=print`;
  const colorId = meta.color ?? 'black';
  const color = getColor(colorId);
  const size = meta.size ?? 'm';
  const qty = Math.max(1, Math.min(5, Number(meta.qty ?? 1)));

  const res = await createOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name: session.customer_details?.name || ship.name || 'Moonworn customer',
      email: session.customer_details?.email ?? null,
      phoneNumber: session.customer_details?.phone ?? null,
      address: {
        line1: ship.address.line1 ?? '',
        line2: ship.address.line2 ?? null,
        postalOrZipCode: ship.address.postal_code ?? '',
        countryCode: ship.address.country ?? '',
        townOrCity: ship.address.city ?? '',
        stateOrCounty: ship.address.state ?? null,
      },
    },
    items: [
      {
        merchantReference: `${session.id}#1`,
        sku: SHIRT_SKU,
        copies: qty,
        sizing: 'fitPrintArea',
        attributes: { color: color.id, size },
        recipientCost: {
          amount: ((SHIRT_PRICE_CENTS * qty) / 100).toFixed(2),
          currency: CURRENCY.toUpperCase(),
        },
        assets: [{ printArea: 'front', url: assetUrl }],
      },
    ],
    metadata: { source: 'moonworn', stripeSession: session.id },
  });

  const outcome = res.outcome;
  const ok = outcome === 'Created' || outcome === 'CreatedWithIssues' || outcome === 'AlreadyExists' || outcome === 'OnHold';
  if (!ok || !res.order?.id) {
    return {
      state: 'failed',
      display,
      prodigiOutcome: outcome,
      error: `Prodigi did not accept the order (outcome: ${outcome}). Payment is safe — retry fulfilment.`,
    };
  }

  await stripe().checkout.sessions.update(session.id, {
    metadata: {
      prodigiOrderId: res.order.id,
      prodigiOutcome: outcome,
      fulfilledAt: new Date().toISOString(),
    },
  });

  return {
    state: outcome === 'AlreadyExists' ? 'already' : 'fulfilled',
    prodigiOrderId: res.order.id,
    prodigiOutcome: outcome,
    prodigiStage: res.order.status?.stage,
    display,
  };
}
