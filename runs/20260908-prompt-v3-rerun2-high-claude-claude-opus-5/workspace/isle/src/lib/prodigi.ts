import { SHIRTS, type Spec } from './chart';
import { PRODUCT, SHIPPING, type ShippingKey } from './spec';

const BASE = process.env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0';

export type Recipient = {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
};

function key(): string {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error('PRODIGI_API_KEY is not set');
  return k;
}

async function call(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'X-API-Key': key(),
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...(rest.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok || (body && body.outcome && !/^(Created|Ok|AlreadyExists)$/i.test(body.outcome))) {
    const err = new Error(
      `Prodigi ${path} failed (${res.status} ${body?.outcome ?? ''}): ${JSON.stringify(body?.failures ?? body)}`.slice(0, 800)
    );
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return body;
}

export type CreateOrderArgs = {
  spec: Spec;
  quantity: number;
  recipient: Recipient;
  shipping: ShippingKey;
  artUrl: string;
  /** Stripe checkout session id: our idempotency key and our reference on Prodigi. */
  reference: string;
};

/**
 * Prodigi accepts an `Idempotency-Key` header and an `?merchantReference=` query
 * parameter but honours neither: posting the same order twice creates two orders,
 * and the filter returns the most recent orders regardless of what you ask for.
 * Verified against the sandbox. So we scan recent orders ourselves before
 * creating, and treat a reference match as "already placed".
 */
export async function findOrderByReference(reference: string) {
  const body = await call('/Orders?top=50', { method: 'GET' });
  const orders = (body?.orders ?? []) as { id: string; merchantReference?: string }[];
  return orders.find((o) => o.merchantReference === reference) ?? null;
}

export async function createOrder(args: CreateOrderArgs) {
  const already = await findOrderByReference(args.reference).catch(() => null);
  if (already) return already as { id: string; status?: { stage?: string } };

  const payload = {
    merchantReference: args.reference,
    shippingMethod: SHIPPING[args.shipping].prodigi,
    recipient: args.recipient,
    items: [
      {
        merchantReference: `isle-${args.spec.name || 'chart'}`.slice(0, 60),
        sku: PRODUCT.sku,
        copies: args.quantity,
        sizing: 'fillPrintArea',
        attributes: {
          color: SHIRTS[args.spec.shirt].prodigi,
          size: args.spec.size,
        },
        assets: [{ printArea: 'front', url: args.artUrl }],
      },
    ],
  };
  const body = await call('/Orders', {
    method: 'POST',
    body: JSON.stringify(payload),
    // Sent for the day Prodigi honours it; the scan above is what actually protects us.
    idempotencyKey: args.reference,
  });
  return body.order as { id: string; status?: { stage?: string } };
}

export async function getOrder(id: string) {
  const body = await call(`/Orders/${encodeURIComponent(id)}`, { method: 'GET' });
  return body.order as {
    id: string;
    status?: { stage?: string; details?: Record<string, string> };
    shipments?: { carrier?: { name?: string }; tracking?: { url?: string; number?: string } }[];
  };
}
