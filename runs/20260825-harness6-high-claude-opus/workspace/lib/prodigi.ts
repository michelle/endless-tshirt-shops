/**
 * Minimal typed client for the Prodigi Print API (v4).
 *
 * Sandbox and live share a schema; only the host and the key differ.
 */

const SANDBOX = 'https://api.sandbox.prodigi.com/v4.0';
const LIVE = 'https://api.prodigi.com/v4.0';

export type ProdigiEnv = 'sandbox' | 'live';

export function prodigiEnv(): ProdigiEnv {
  return process.env.PRODIGI_ENV === 'live' ? 'live' : 'sandbox';
}

export function prodigiBaseUrl(): string {
  return prodigiEnv() === 'live' ? LIVE : SANDBOX;
}

export function isProdigiConfigured(): boolean {
  return Boolean(process.env.PRODIGI_API_KEY);
}

export class ProdigiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ProdigiError';
    this.status = status;
    this.body = body;
  }
}

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

export type CreateOrderRequest = {
  merchantReference: string;
  shippingMethod: string;
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  items: ProdigiOrderItem[];
  metadata?: Record<string, string | number>;
  callbackUrl?: string;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  merchantReference?: string | null;
  shippingMethod?: string;
  status: {
    stage: string;
    issues: { objectId?: string; errorCode?: string; description?: string }[];
    details?: Record<string, string>;
  };
  charges?: {
    totalCost?: { amount: string; currency: string };
    totalTax?: { amount: string; currency: string };
  }[];
  shipments?: {
    id: string;
    carrier?: { name?: string; service?: string } | null;
    tracking?: { number?: string; url?: string } | null;
    status?: string;
    dispatchDate?: string | null;
  }[];
  items?: {
    id: string;
    sku: string;
    status?: string;
    thumbnailUrl?: string | null;
    attributes?: Record<string, string>;
  }[];
  recipient?: ProdigiRecipient;
};

async function request<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new ProdigiError('PRODIGI_API_KEY is not set on this deployment.', 503, null);
  }

  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.idempotencyKey) headers['X-Idempotency-Key'] = init.idempotencyKey;

  const response = await fetch(`${prodigiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const payload = body as
      | { message?: string; outcome?: string; failures?: Record<string, { code?: string }[]> }
      | null;
    // Prodigi returns `ValidationFailed` with a per-field breakdown; surface the
    // fields, otherwise every bad order looks identical in the logs.
    const failures = payload?.failures
      ? Object.entries(payload.failures)
          .map(([field, issues]) => `${field} (${issues.map((i) => i.code).join(', ')})`)
          .join('; ')
      : null;
    const detail = [payload?.message ?? payload?.outcome ?? response.statusText, failures]
      .filter(Boolean)
      .join(' — ');
    throw new ProdigiError(`Prodigi ${path} failed: ${detail}`, response.status, body);
  }

  return body as T;
}

/**
 * Prodigi honours the idempotency key: a repeat POST returns
 * `outcome: "AlreadyExists"` with the original order rather than a second one.
 * That is what makes the browser and the webhook safe to race.
 */
export function createProdigiOrder(order: CreateOrderRequest): Promise<{
  outcome: string;
  order: ProdigiOrder;
}> {
  return request('/Orders', {
    method: 'POST',
    body: JSON.stringify(order),
    idempotencyKey: order.idempotencyKey,
  });
}

export function getProdigiOrder(id: string): Promise<{ outcome: string; order: ProdigiOrder }> {
  return request(`/Orders/${encodeURIComponent(id)}`);
}

/**
 * Best-effort recovery for the narrow window where an order was created but we
 * failed to write its id back onto the payment.
 *
 * Note: the sandbox ignores the `merchantReference` filter and returns the
 * whole (newest-first) list, so this filters client side over a bounded page.
 * The idempotency key on create is the actual duplicate guarantee.
 */
export async function findOrderByMerchantReference(
  reference: string,
): Promise<ProdigiOrder | null> {
  const result = await request<{ orders?: ProdigiOrder[] }>(
    `/Orders?merchantReference=${encodeURIComponent(reference)}&top=50`,
  );
  const match = result.orders?.find((o) => o.merchantReference === reference);
  return match ?? null;
}

export type QuoteRequest = {
  shippingMethod: string;
  destinationCountryCode: string;
  currencyCode: string;
  items: { sku: string; copies: number; attributes: Record<string, string>; assets: { printArea: string }[] }[];
};

export function quoteProdigiOrder(quote: QuoteRequest): Promise<{
  outcome: string;
  quotes: {
    shipmentMethod: string;
    costSummary: {
      items?: { amount: string; currency: string };
      shipping?: { amount: string; currency: string };
      totalCost?: { amount: string; currency: string };
      totalTax?: { amount: string; currency: string };
    };
  }[];
}> {
  return request('/quotes', { method: 'POST', body: JSON.stringify(quote) });
}

/**
 * A short, human-friendly summary of where an order is. `stage` alone is too
 * coarse — it says "InProgress" from the moment the order lands until it
 * ships — so lean on the step details when they are there.
 */
export function describeStage(order: ProdigiOrder | null | undefined): string {
  if (!order) return 'Not submitted yet';

  const shipment = order.shipments?.find((s) => s.tracking?.number);
  if (shipment?.tracking?.number) return `Shipped — ${shipment.carrier?.service ?? 'in transit'}`;

  if (order.status?.stage === 'Cancelled') return 'Cancelled';
  if (order.status?.stage === 'Complete') return 'Complete';

  const details = order.status?.details ?? {};
  if (details.shipping && details.shipping !== 'NotStarted') return 'Packing';
  if (details.inProduction && details.inProduction !== 'NotStarted') return 'On the press';
  if (details.printReadyAssetsPrepared === 'Complete') return 'Queued for printing';
  if (details.downloadAssets === 'Complete') return 'Preparing your print file';
  return 'Received';
}
