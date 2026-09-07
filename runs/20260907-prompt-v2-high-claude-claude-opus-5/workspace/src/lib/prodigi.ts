import { PRODIGI_SKU, printPath } from './catalog';
import type { CartLine } from './cart';

const BASE =
  process.env.PRODIGI_API_BASE ??
  (process.env.PRODIGI_API_KEY?.startsWith('test_')
    ? 'https://api.sandbox.prodigi.com/v4.0'
    : 'https://api.prodigi.com/v4.0');

export type ProdigiOrder = {
  id: string;
  merchantReference?: string;
  status?: { stage?: string; details?: Record<string, string>; issues?: unknown[] };
  shipments?: { tracking?: { number?: string; url?: string }; carrier?: { name?: string } }[];
};

function key() {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error('PRODIGI_API_KEY is not configured');
  return k;
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-API-Key': key(), 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON error page */ }
  if (!res.ok) {
    throw new Error(`Prodigi ${res.status}: ${body ? JSON.stringify(body).slice(0, 500) : text.slice(0, 300)}`);
  }
  return body;
}

export async function findOrderByReference(reference: string): Promise<ProdigiOrder | null> {
  const body = await call(`/Orders?merchantReferences=${encodeURIComponent(reference)}`);
  const orders: ProdigiOrder[] = body?.orders ?? [];
  return orders.find((o) => o.merchantReference === reference) ?? null;
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  const body = await call(`/Orders/${encodeURIComponent(id)}`);
  return body?.order ?? null;
}

export type Recipient = {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string; line2?: string; townOrCity: string;
    stateOrCounty?: string; postalOrZipCode: string; countryCode: string;
  };
};

export function buildItems(lines: CartLine[], origin: string) {
  return lines.map((l, i) => ({
    merchantReference: `${l.slug}-${l.color}-${l.size}-${i}`,
    sku: PRODIGI_SKU,
    copies: l.qty,
    sizing: 'fitPrintArea',
    attributes: { color: l.color, size: l.size },
    assets: [{ printArea: 'front', url: `${origin}${printPath(l.slug, l.color)}` }],
  }));
}

/**
 * Places the order, keyed on `reference` (we use the Stripe Checkout Session id).
 * Safe to call repeatedly: an existing order with the same reference is returned as-is.
 */
export async function placeOrder(opts: {
  reference: string;
  recipient: Recipient;
  lines: CartLine[];
  origin: string;
  shippingMethod?: string;
  metadata?: Record<string, string>;
}): Promise<{ order: ProdigiOrder; created: boolean }> {
  const existing = await findOrderByReference(opts.reference);
  if (existing) return { order: existing, created: false };

  const body = await call('/Orders', {
    method: 'POST',
    body: JSON.stringify({
      merchantReference: opts.reference,
      shippingMethod: opts.shippingMethod ?? 'Budget',
      recipient: opts.recipient,
      items: buildItems(opts.lines, opts.origin),
      metadata: opts.metadata ?? {},
    }),
  });
  return { order: body.order as ProdigiOrder, created: true };
}

export const PRODIGI_BASE = BASE;
