/**
 * Prodigi Print API v4 client.
 *
 * Replaces the original store's Scalable Press integration. The shape of the
 * flow is the same: quote first (which validates the address and tells us what
 * fulfilment will cost), take the money, then place the order.
 */

import { requireEnv } from './env';

const DEFAULT_BASE = 'https://api.sandbox.prodigi.com/v4.0';

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
};

export type ProdigiRecipient = {
  name: string;
  email?: string;
  address: ProdigiAddress;
};

export type ProdigiItem = {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
  attributes: Record<string, string>;
  assets: { printArea: string; url?: string }[];
};

export type ProdigiCost = { amount: string; currency: string };

export type ProdigiQuote = {
  shipmentMethod: string;
  costSummary: {
    items: ProdigiCost;
    shipping: ProdigiCost;
    totalCost?: ProdigiCost;
    totalTax?: ProdigiCost;
  };
};

export type ProdigiIssue = { errorCode: string; description: string };

export class ProdigiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: ProdigiIssue[] = [],
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ProdigiError';
  }
}

function baseUrl(): string {
  return (process.env.PRODIGI_API_URL || DEFAULT_BASE).replace(/\/$/, '');
}

async function call<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string } = {
    method: 'GET',
  },
): Promise<T> {
  const headers: Record<string, string> = {
    'X-API-Key': requireEnv('PRODIGI_API_KEY'),
    Accept: 'application/json',
  };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.idempotencyKey) headers['X-Idempotency-Key'] = init.idempotencyKey;

  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* Prodigi occasionally returns a bare error string. */
  }

  // Prodigi reports soft failures in `outcome` even on a 200.
  const outcome: string | undefined = json?.outcome;
  const issues: ProdigiIssue[] = Array.isArray(json?.issues)
    ? json.issues.map((i: any) => ({
        errorCode: String(i?.errorCode ?? 'Unknown'),
        description: String(i?.description ?? ''),
      }))
    : [];

  if (!res.ok) {
    throw new ProdigiError(
      issues[0]?.description || `Prodigi request failed (${res.status})`,
      res.status,
      issues,
      json ?? text,
    );
  }

  // `CreatedWithIssues` is used for warnings (e.g. "sales tax may apply") as
  // well as for real problems, so only hard-fail on non-Ok/non-Created.
  if (outcome && !/^(Ok|Created|CreatedWithIssues|AlreadyExists)$/i.test(outcome)) {
    throw new ProdigiError(
      issues[0]?.description || `Prodigi returned outcome: ${outcome}`,
      res.status,
      issues,
      json,
    );
  }

  return json as T;
}

/** Warnings we deliberately ignore — informational, not blocking. */
const IGNORABLE_ISSUES = /SalesTaxWarning/i;

export function blockingIssues(issues: ProdigiIssue[] = []): ProdigiIssue[] {
  return issues.filter((i) => !IGNORABLE_ISSUES.test(i.errorCode));
}

export async function getQuote(params: {
  sku: string;
  attributes: Record<string, string>;
  destinationCountryCode: string;
  currencyCode?: string;
  shippingMethod?: string;
  printArea?: string;
}): Promise<{ quote: ProdigiQuote | null; issues: ProdigiIssue[] }> {
  const body = {
    shippingMethod: params.shippingMethod ?? 'Budget',
    destinationCountryCode: params.destinationCountryCode,
    currencyCode: params.currencyCode ?? 'USD',
    items: [
      {
        sku: params.sku,
        copies: 1,
        attributes: params.attributes,
        assets: [{ printArea: params.printArea ?? 'front' }],
      },
    ],
  };

  const json = await call<{ quotes?: ProdigiQuote[]; issues?: ProdigiIssue[] }>(
    '/quotes',
    { method: 'POST', body },
  );

  return { quote: json.quotes?.[0] ?? null, issues: json.issues ?? [] };
}

export async function createOrder(params: {
  merchantReference: string;
  shippingMethod?: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; status: unknown; raw: any }> {
  const json = await call<{ order?: any; issues?: ProdigiIssue[] }>('/orders', {
    method: 'POST',
    idempotencyKey: params.idempotencyKey ?? params.merchantReference,
    body: {
      merchantReference: params.merchantReference,
      shippingMethod: params.shippingMethod ?? 'Budget',
      recipient: params.recipient,
      items: params.items,
      metadata: params.metadata,
    },
  });

  const order = json.order;
  if (!order?.id) {
    throw new ProdigiError(
      'Prodigi accepted the request but returned no order id',
      200,
      json.issues ?? [],
      json,
    );
  }
  return { id: order.id, status: order.status, raw: order };
}

/**
 * Looks for an order we have already placed for `merchantReference`.
 *
 * Prodigi accepts the `merchantReference` query parameter but does not
 * actually filter on it, so we scan the most recent orders ourselves. A
 * duplicate would be created seconds after the original, so the newest page is
 * where it will be.
 */
export async function findOrderByMerchantReference(
  merchantReference: string,
  scan = 50,
): Promise<{ id: string } | null> {
  const json = await call<{ orders?: any[] }>(`/orders?top=${scan}`);
  const match = (json.orders ?? []).find(
    (o) => o?.merchantReference === merchantReference,
  );
  return match ? { id: match.id } : null;
}

export async function getOrder(id: string): Promise<any> {
  const json = await call<{ order?: any }>(`/orders/${encodeURIComponent(id)}`);
  return json.order ?? null;
}
