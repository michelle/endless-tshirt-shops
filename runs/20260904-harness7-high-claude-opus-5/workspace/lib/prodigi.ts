/**
 * Minimal typed client for the Prodigi Print API v4.
 *
 * Prodigi replaces the Scalable Press flow the original store used. The shape
 * of the integration is simpler: there is no separate "upload a design" step,
 * because Prodigi pulls print assets from a URL we host. Our artwork endpoint
 * is deterministic for a given timestamp, so the asset URL *is* the design.
 */

const SANDBOX_BASE = 'https://api.sandbox.prodigi.com/v4.0';
const LIVE_BASE = 'https://api.prodigi.com/v4.0';

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
  email?: string | null;
  phoneNumber?: string | null;
  address: ProdigiAddress;
};

export type ProdigiOrderItem = {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
};

export type ProdigiOrderRequest = {
  merchantReference: string;
  shippingMethod: 'Budget' | 'Standard' | 'Express' | 'Overnight';
  idempotencyKey: string;
  callbackUrl?: string;
  recipient: ProdigiRecipient;
  items: ProdigiOrderItem[];
  metadata?: Record<string, string>;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  merchantReference: string | null;
  status: {
    stage: string;
    issues: { objectId?: string; errorCode?: string; description?: string }[];
    details: Record<string, string>;
  };
  charges?: unknown[];
  shipments?: {
    id: string;
    carrier?: { name?: string; service?: string } | null;
    tracking?: { number?: string; url?: string } | null;
    status?: string;
  }[];
  recipient?: ProdigiRecipient;
};

export class ProdigiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ProdigiError';
  }
}

function baseUrl(): string {
  // Default to sandbox: shipping real product should be a deliberate, explicit
  // switch, never something you get by forgetting to set an env var.
  return process.env.PRODIGI_ENV === 'live' ? LIVE_BASE : SANDBOX_BASE;
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

async function call<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers: {
      'X-API-Key': apiKey(),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new ProdigiError(
      `Prodigi ${init.method} ${path} failed with ${res.status}`,
      res.status,
      parsed,
    );
  }
  return parsed as T;
}

/**
 * Create an order.
 *
 * Prodigi honours `idempotencyKey`: replaying the same key returns the order
 * that already exists rather than printing a second shirt. We key on the Stripe
 * Checkout Session id, which means the webhook and the order-status endpoint
 * can both race to fulfil a payment without any risk of duplicates.
 */
export async function createOrder(
  order: ProdigiOrderRequest,
): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call('/Orders', { method: 'POST', body: order });
}

export async function getOrder(id: string): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call(`/Orders/${encodeURIComponent(id)}`);
}

/**
 * Look an order up by the reference we assigned it (the Stripe session id).
 *
 * Note: the v4 `/Orders` endpoint accepts a `merchantReference` query parameter
 * but does *not* actually filter on it — it returns the most recent orders
 * regardless. Trusting it would hand back a stranger's order, so we page
 * through recent orders and match the reference ourselves.
 */
export async function findOrderByMerchantReference(
  reference: string,
  { maxPages = 4, pageSize = 50 }: { maxPages?: number; pageSize?: number } = {},
): Promise<ProdigiOrder | null> {
  for (let page = 0; page < maxPages; page++) {
    const res = await call<{ outcome: string; hasMore?: boolean; orders: ProdigiOrder[] }>(
      `/Orders?top=${pageSize}&skip=${page * pageSize}`,
    );
    const hit = res.orders?.find((o) => o.merchantReference === reference);
    if (hit) return hit;
    if (!res.hasMore || !res.orders?.length) break;
  }
  return null;
}

/** Human-readable progress for the order-status page. */
export function summariseStage(order: ProdigiOrder): string {
  const stage = order.status?.stage ?? 'Unknown';
  const shipment = order.shipments?.find((s) => s.tracking?.number);
  if (shipment?.tracking?.number) {
    return `Shipped — ${shipment.carrier?.name ?? 'carrier'} ${shipment.tracking.number}`;
  }
  switch (stage) {
    case 'InProgress':
      return 'In production';
    case 'Complete':
      return 'Complete';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return stage;
  }
}
