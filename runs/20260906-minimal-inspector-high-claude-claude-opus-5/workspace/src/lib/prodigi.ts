import { optionalEnv, requireEnv } from './env';

const SANDBOX_BASE = 'https://api.sandbox.prodigi.com/v4.0';
const LIVE_BASE = 'https://api.prodigi.com/v4.0';

/** Sandbox keys are prefixed `test_`; anything else is treated as live. */
export function prodigiEnvironment(): 'sandbox' | 'live' {
  const explicit = optionalEnv('PRODIGI_ENVIRONMENT');
  if (explicit === 'sandbox' || explicit === 'live') return explicit;
  return (optionalEnv('PRODIGI_API_KEY') ?? '').startsWith('test_') ? 'sandbox' : 'live';
}

function baseUrl(): string {
  return prodigiEnvironment() === 'sandbox' ? SANDBOX_BASE : LIVE_BASE;
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
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
};

export type ProdigiIssue = {
  objectId?: string | null;
  errorCode?: string;
  description?: string;
};

export type ProdigiOrder = {
  id: string;
  created?: string;
  status?: {
    stage?: string;
    issues?: ProdigiIssue[];
    details?: Record<string, string>;
  };
  merchantReference?: string;
  shipments?: Array<{
    id?: string;
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string };
    dispatchDate?: string;
  }>;
};

type RequestOptions = {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  timeoutMs?: number;
};

async function request<T>({ method, path, body, timeoutMs = 20_000 }: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        'X-API-Key': requireEnv('PRODIGI_API_KEY'),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      throw new ProdigiError(
        `Prodigi ${method} ${path} failed with ${response.status}`,
        response.status,
        parsed,
      );
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof ProdigiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProdigiError(`Prodigi ${method} ${path} timed out`, 504, null);
    }
    throw new ProdigiError(
      `Prodigi ${method} ${path} failed: ${(error as Error).message}`,
      502,
      null,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Issues Prodigi reports that must not block a sale. The US sales-tax note is
 * informational: it fires on every US quote.
 */
const NON_BLOCKING_ISSUE_CODES = new Set(['destinationcountrycode.ussalestaxwarning']);

export function blockingIssues(issues: ProdigiIssue[] | undefined | null): ProdigiIssue[] {
  return (issues ?? []).filter((issue) => {
    const code = (issue.errorCode ?? '').toLowerCase();
    return !NON_BLOCKING_ISSUE_CODES.has(code) && !code.endsWith('warning');
  });
}

export type QuoteResult = {
  ok: boolean;
  issues: ProdigiIssue[];
  totalCost?: { amount: string; currency: string };
  shipmentMethod?: string;
};

/**
 * Pre-flight a sale the way the original store did: ask the printer whether it
 * can actually make and ship this shirt before anyone's card is touched.
 */
export async function quoteShirt(params: {
  sku: string;
  attributes: Record<string, string>;
  destinationCountryCode: string;
}): Promise<QuoteResult> {
  type QuoteResponse = {
    outcome?: string;
    issues?: ProdigiIssue[];
    quotes?: Array<{
      shipmentMethod?: string;
      costSummary?: { totalCost?: { amount: string; currency: string } };
    }>;
  };

  const data = await request<QuoteResponse>({
    method: 'POST',
    path: '/quotes',
    body: {
      shippingMethod: 'Budget',
      destinationCountryCode: params.destinationCountryCode,
      currencyCode: 'USD',
      items: [
        {
          sku: params.sku,
          copies: 1,
          attributes: params.attributes,
          assets: [{ printArea: 'front' }],
        },
      ],
    },
    timeoutMs: 15_000,
  });

  const issues = blockingIssues(data.issues);
  const quote = data.quotes?.[0];
  const outcomeOk = (data.outcome ?? '').toLowerCase().startsWith('created');

  return {
    ok: outcomeOk && issues.length === 0 && Boolean(quote),
    issues,
    totalCost: quote?.costSummary?.totalCost,
    shipmentMethod: quote?.shipmentMethod,
  };
}

export type CreateOrderParams = {
  idempotencyKey: string;
  merchantReference: string;
  recipient: { name: string; email?: string; address: ProdigiAddress };
  sku: string;
  attributes: Record<string, string>;
  artworkUrl: string;
  shippingMethod: string;
  callbackUrl?: string;
  metadata?: Record<string, string>;
};

export async function createOrder(params: CreateOrderParams): Promise<ProdigiOrder> {
  type CreateOrderResponse = { outcome?: string; order?: ProdigiOrder };

  const data = await request<CreateOrderResponse>({
    method: 'POST',
    path: '/Orders',
    body: {
      merchantReference: params.merchantReference,
      shippingMethod: params.shippingMethod,
      idempotencyKey: params.idempotencyKey,
      callbackUrl: params.callbackUrl,
      recipient: params.recipient,
      metadata: params.metadata,
      items: [
        {
          merchantReference: params.merchantReference,
          sku: params.sku,
          copies: 1,
          sizing: 'fitPrintArea',
          attributes: params.attributes,
          assets: [{ printArea: 'front', url: params.artworkUrl }],
        },
      ],
    },
    timeoutMs: 25_000,
  });

  const outcome = (data.outcome ?? '').toLowerCase();
  const accepted =
    outcome === 'created' ||
    outcome === 'createdwithissues' ||
    outcome === 'alreadyexists' ||
    outcome === 'onhold';

  if (!accepted || !data.order?.id) {
    throw new ProdigiError(`Prodigi rejected the order (outcome: ${data.outcome})`, 422, data);
  }
  return data.order;
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const data = await request<{ order?: ProdigiOrder }>({
      method: 'GET',
      path: `/Orders/${encodeURIComponent(id)}`,
      timeoutMs: 15_000,
    });
    return data.order ?? null;
  } catch (error) {
    if (error instanceof ProdigiError && error.status === 404) return null;
    throw error;
  }
}
