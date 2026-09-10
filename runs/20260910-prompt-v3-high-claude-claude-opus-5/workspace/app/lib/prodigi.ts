// Thin Prodigi v4 client: quoting before checkout, order creation after
// payment, and status lookup for the confirmation page.

import { PRODIGI_SKU, PRINT_AREA } from './catalog';

const BASE = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0';

export type Address = {
  name: string;
  email: string;
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
};

export type ShippingMethod = 'Budget' | 'Standard' | 'Express' | 'Overnight';

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

async function call<T>(path: string, init?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const headers: Record<string, string> = {
    'X-API-Key': apiKey(),
    'Content-Type': 'application/json',
  };
  if (init?.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;

  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: 'no-store' });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${path} failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return body as T;
}

export type QuoteResult = {
  method: ShippingMethod;
  shippingCents: number;
  itemsCents: number;
  taxCents: number;
  currency: string;
  carrier: string | null;
};

type ProdigiQuoteResponse = {
  outcome: string;
  quotes?: Array<{
    shipmentMethod: string;
    costSummary: {
      items: { amount: string; currency: string };
      shipping: { amount: string; currency: string };
      totalTax?: { amount: string; currency: string };
    };
    shipments?: Array<{ carrier?: { name?: string; service?: string } }>;
  }>;
};

const toCents = (amount: string | undefined) =>
  Math.round(parseFloat(amount || '0') * 100);

/** Live cost of fulfilling `copies` shirts to `countryCode`. */
export async function getQuotes(
  countryCode: string,
  size: string,
  color: string,
  copies: number,
  currency = 'USD',
): Promise<QuoteResult[]> {
  const body = {
    destinationCountryCode: countryCode.toUpperCase(),
    currencyCode: currency.toUpperCase(),
    items: [
      {
        sku: PRODIGI_SKU,
        copies,
        attributes: { color, size },
        assets: [{ printArea: PRINT_AREA }],
      },
    ],
  };

  const results: QuoteResult[] = [];
  for (const method of ['Budget', 'Express'] as ShippingMethod[]) {
    try {
      const json = await call<ProdigiQuoteResponse>('/quotes', {
        method: 'POST',
        body: JSON.stringify({ ...body, shippingMethod: method }),
      });
      for (const q of json.quotes || []) {
        results.push({
          method: (q.shipmentMethod as ShippingMethod) || method,
          shippingCents: toCents(q.costSummary.shipping.amount),
          itemsCents: toCents(q.costSummary.items.amount),
          taxCents: toCents(q.costSummary.totalTax?.amount),
          currency: q.costSummary.shipping.currency || currency,
          carrier: q.shipments?.[0]?.carrier?.service || q.shipments?.[0]?.carrier?.name || null,
        });
      }
    } catch {
      // A method that is not offered for this destination simply drops out.
    }
  }

  // One entry per method, cheapest first.
  const seen = new Set<string>();
  return results
    .sort((a, b) => a.shippingCents - b.shippingCents)
    .filter((r) => (seen.has(r.method) ? false : (seen.add(r.method), true)));
}

export type ProdigiOrder = {
  id: string;
  status?: {
    stage?: string;
    issues?: Array<{ objectId?: string; errorCode?: string; description?: string }>;
    details?: Record<string, string>;
  };
  shipments?: Array<{
    id?: string;
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string };
    dispatchDate?: string;
  }>;
  created?: string;
};

export type CreateOrderArgs = {
  merchantReference: string;
  idempotencyKey: string;
  recipient: Address;
  shippingMethod: ShippingMethod;
  size: string;
  color: string;
  copies: number;
  assetUrl: string;
  itemReference: string;
};

export async function createOrder(args: CreateOrderArgs): Promise<ProdigiOrder> {
  const { recipient } = args;
  const payload = {
    merchantReference: args.merchantReference,
    shippingMethod: args.shippingMethod,
    idempotencyKey: args.idempotencyKey,
    recipient: {
      name: recipient.name,
      email: recipient.email,
      address: {
        line1: recipient.line1,
        line2: recipient.line2 || null,
        postalOrZipCode: recipient.postalOrZipCode,
        countryCode: recipient.countryCode.toUpperCase(),
        townOrCity: recipient.townOrCity,
        stateOrCounty: recipient.stateOrCounty || null,
      },
    },
    items: [
      {
        merchantReference: args.itemReference,
        sku: PRODIGI_SKU,
        copies: args.copies,
        sizing: 'fillPrintArea',
        attributes: { color: args.color, size: args.size },
        assets: [{ printArea: PRINT_AREA, url: args.assetUrl }],
      },
    ],
  };

  const json = await call<{ outcome: string; order: ProdigiOrder }>('/Orders', {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: args.idempotencyKey,
  });
  return json.order;
}

export async function getOrder(id: string): Promise<ProdigiOrder> {
  const json = await call<{ outcome: string; order: ProdigiOrder }>(`/Orders/${encodeURIComponent(id)}`);
  return json.order;
}
