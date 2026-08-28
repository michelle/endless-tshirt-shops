import {
  PRODIGI_COLOR,
  PRODIGI_SHIPPING_METHOD,
  PRODIGI_SIZES,
  STYLE_SPECS,
  type Size,
  type Style,
} from './catalog';

const SANDBOX_BASE = 'https://api.sandbox.prodigi.com/v4.0';
const LIVE_BASE = 'https://api.prodigi.com/v4.0';

export function prodigiBaseUrl(): string {
  // Sandbox keys are prefixed `test_`; anything else is treated as live so that
  // swapping in a production key is a one-variable change.
  const key = process.env.PRODIGI_API_KEY ?? '';
  return key.startsWith('test_') ? SANDBOX_BASE : LIVE_BASE;
}

export function isProdigiSandbox(): boolean {
  return prodigiBaseUrl() === SANDBOX_BASE;
}

export type ProdigiRecipient = {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address: {
    line1: string;
    line2?: string | null;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string | null;
  };
};

export type ProdigiOrder = {
  id: string;
  created: string;
  status: {
    stage: string;
    issues: Array<{ objectId?: string; errorCode?: string; description?: string }>;
    details: Record<string, string>;
  };
  shipments?: Array<{
    id: string;
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string };
    dispatchDate?: string | null;
  }>;
  items?: Array<{ sku: string; attributes?: Record<string, string> }>;
};

class ProdigiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ProdigiError';
  }
}

async function prodigiFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error('PRODIGI_API_KEY is not set');

  const { idempotencyKey, ...rest } = init;
  const res = await fetch(`${prodigiBaseUrl()}${path}`, {
    ...rest,
    cache: 'no-store',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      ...(rest.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw text */
  }

  if (!res.ok) {
    throw new ProdigiError(`Prodigi ${path} failed (${res.status})`, res.status, body);
  }
  return body as T;
}

export type QuoteResult = {
  itemsCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
};

function toCents(amount: string | undefined): number {
  return Math.round(Number(amount ?? '0') * 100);
}

/** Live landed-cost check, used by /api/health and the margin note in the README. */
export async function quote(
  style: Style,
  size: Size,
  countryCode: string,
): Promise<QuoteResult | null> {
  const body = {
    shippingMethod: PRODIGI_SHIPPING_METHOD,
    destinationCountryCode: countryCode,
    currencyCode: 'USD',
    items: [
      {
        sku: STYLE_SPECS[style].sku,
        copies: 1,
        attributes: { color: PRODIGI_COLOR, size: PRODIGI_SIZES[size] },
        assets: [{ printArea: 'front' }],
      },
    ],
  };

  const result = await prodigiFetch<{
    quotes?: Array<{ costSummary: Record<string, { amount: string; currency: string }> }>;
  }>('/quotes', { method: 'POST', body: JSON.stringify(body) });

  const summary = result.quotes?.[0]?.costSummary;
  if (!summary) return null;

  return {
    itemsCents: toCents(summary.items?.amount),
    shippingCents: toCents(summary.shipping?.amount),
    taxCents: toCents(summary.totalTax?.amount),
    totalCents: toCents(summary.totalCost?.amount),
    currency: summary.totalCost?.currency ?? 'USD',
  };
}

export type CreateOrderInput = {
  /** Stripe Checkout Session id — doubles as our idempotency key and merchant reference. */
  reference: string;
  style: Style;
  size: Size;
  artworkUrl: string;
  recipient: ProdigiRecipient;
  callbackUrl?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<ProdigiOrder> {
  const body = {
    merchantReference: input.reference,
    shippingMethod: PRODIGI_SHIPPING_METHOD,
    idempotencyKey: input.reference,
    recipient: input.recipient,
    ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
    items: [
      {
        merchantReference: input.reference,
        sku: STYLE_SPECS[input.style].sku,
        copies: 1,
        // The design is a wide transparent strip; `fillPrintArea` would crop it,
        // so fit it inside the print area and let Prodigi centre it.
        sizing: 'fitPrintArea',
        attributes: { color: PRODIGI_COLOR, size: PRODIGI_SIZES[input.size] },
        assets: [{ printArea: 'front', url: input.artworkUrl }],
      },
    ],
  };

  const result = await prodigiFetch<{ order: ProdigiOrder }>('/Orders', {
    method: 'POST',
    body: JSON.stringify(body),
    idempotencyKey: input.reference,
  });
  return result.order;
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const result = await prodigiFetch<{ order: ProdigiOrder }>(
      `/Orders/${encodeURIComponent(id)}`,
    );
    return result.order;
  } catch (err) {
    if (err instanceof ProdigiError && err.status === 404) return null;
    throw err;
  }
}

export { ProdigiError };
