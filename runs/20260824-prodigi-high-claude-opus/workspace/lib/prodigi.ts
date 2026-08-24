/**
 * Prodigi Print API (v4) client.
 *
 * Replaces the original store's Scalable Press integration. Two differences
 * worth knowing:
 *
 *  - Prodigi takes artwork as a URL it fetches itself, so we never upload a
 *    multi-megabyte data URI. We hand it a deterministic, cacheable endpoint
 *    (`/api/artwork?t=<ms>`) that renders the shirt's timestamp on demand.
 *  - Size and color are Prodigi *attributes* on a single catalog SKU, not
 *    separate SKUs.
 */

import { env } from './env';
import {
  PRODIGI_SIZES,
  STYLES,
  type ShirtSize,
  type ShirtStyle,
} from './catalog';

const BASE_URLS = {
  sandbox: 'https://api.sandbox.prodigi.com/v4.0',
  live: 'https://api.prodigi.com/v4.0',
} as const;

/** Cheapest tracked service; we advertise free shipping and eat the cost. */
export const SHIPPING_METHOD = 'Budget';

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  townOrCity: string;
  stateOrCounty?: string | null;
  postalOrZipCode: string;
  countryCode: string;
};

export type ProdigiRecipient = {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address: ProdigiAddress;
};

export type ProdigiOrderSummary = {
  id: string;
  status: string;
  stage: string;
  details: unknown;
};

export class ProdigiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    // Prodigi puts the useful part (which field, which code) in the body, so
    // fold it into the message — otherwise every log line reads "failed (400)".
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    super(detail ? `${message}: ${detail}` : message);
    this.name = 'ProdigiError';
    this.status = status;
    this.body = body;
  }
}

/*
 * The sandbox in particular returns the occasional 503. Every call we make is
 * safe to repeat — reads are reads, and `POST /Orders` carries an
 * `idempotencyKey` — so retry transient failures rather than stranding a paid
 * order until something else happens to retry it.
 */
const RETRY_DELAYS_MS = [500];

/*
 * A per-attempt timeout matters as much as the retry does. Prodigi outages
 * present as hangs, not as prompt 503s, and an unbounded fetch will happily eat
 * the entire serverless invocation budget and turn one sick upstream into a
 * 504 on our own endpoint. Worst case here is 2 x 8s + 0.5s, which fits inside
 * the 30s we give the fulfillment routes.
 */
const ATTEMPT_TIMEOUT_MS = 8_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const url = `${BASE_URLS[env.prodigiEnvironment]}${path}`;
  const method = init.method ?? 'GET';
  const timeoutMs = init.timeoutMs ?? ATTEMPT_TIMEOUT_MS;
  const delays = RETRY_DELAYS_MS.slice(0, init.retries ?? RETRY_DELAYS_MS.length);
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    if (attempt > 0) await sleep(delays[attempt - 1]);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'X-API-Key': env.prodigiApiKey,
          'Content-Type': 'application/json',
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      // Timeout, DNS, TLS or socket failure — always worth another go.
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      lastError = timedOut
        ? new ProdigiError(`Prodigi ${method} ${path} timed out after ${timeoutMs}ms`, 504, null)
        : error;
      if (attempt < delays.length) {
        console.warn(`[prodigi] ${method} ${path} attempt ${attempt + 1} failed — retrying`);
        continue;
      }
      break;
    }

    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      /* leave as text */
    }

    if (!response.ok) {
      const error = new ProdigiError(
        `Prodigi ${method} ${path} failed (${response.status})`,
        response.status,
        payload,
      );
      if (isTransient(response.status) && attempt < delays.length) {
        console.warn(`[prodigi] ${error.message} — retrying`);
        lastError = error;
        continue;
      }
      throw error;
    }

    return validate<T>(payload, method, path, response.status);
  }

  throw lastError instanceof Error
    ? lastError
    : new ProdigiError(`Prodigi ${method} ${path} failed`, 0, String(lastError));
}

/** A 200 with a bad `outcome` is still a failure as far as we are concerned. */
function validate<T>(payload: unknown, method: string, path: string, status: number): T {
  const outcome = (payload as { outcome?: string } | null)?.outcome;
  if (outcome && !/^(Ok|Created|CreatedWithIssues|AlreadyExists|InProgress)$/i.test(outcome)) {
    throw new ProdigiError(
      `Prodigi ${method} ${path} returned outcome "${outcome}"`,
      status,
      payload,
    );
  }

  return payload as T;
}

type LineItem = {
  style: ShirtStyle;
  size: ShirtSize;
  artworkUrl: string;
  reference: string;
};

function buildItems(item: LineItem) {
  const spec = STYLES[item.style];
  return [
    {
      merchantReference: item.reference,
      sku: spec.sku,
      copies: 1,
      // Our asset is generated at the print area's aspect ratio already, so
      // "fill" is a no-op crop and keeps the timestamp exactly where we put it.
      sizing: 'fillPrintArea',
      attributes: {
        color: spec.color,
        size: PRODIGI_SIZES[item.size],
      },
      assets: [{ printArea: 'front', url: item.artworkUrl }],
    },
  ];
}

/**
 * Price and validate an order without committing to it.
 *
 * /quotes has a stricter schema than /Orders: `merchantReference`, `sizing` and
 * `assets[].url` are all rejected as `UnknownField`, so the line item has to be
 * rebuilt rather than reused.
 */
export async function quote(args: {
  item: LineItem;
  destinationCountryCode: string;
  /** The health check quotes for information only, so it waits less. */
  timeoutMs?: number;
  retries?: number;
}) {
  const spec = STYLES[args.item.style];
  const items = [
    {
      sku: spec.sku,
      copies: 1,
      attributes: { color: spec.color, size: PRODIGI_SIZES[args.item.size] },
      assets: [{ printArea: 'front' }],
    },
  ];

  return call<{
    outcome: string;
    issues?: unknown[];
    quotes?: Array<{
      shipmentMethod: string;
      costSummary: {
        items: { amount: string; currency: string };
        shipping: { amount: string; currency: string };
        totalCost: { amount: string; currency: string };
      };
    }>;
  }>('/quotes', {
    method: 'POST',
    timeoutMs: args.timeoutMs,
    retries: args.retries,
    body: {
      shippingMethod: SHIPPING_METHOD,
      destinationCountryCode: args.destinationCountryCode,
      currencyCode: 'USD',
      items,
    },
  });
}

/**
 * Submit a print order. `idempotencyKey` is the Stripe PaymentIntent id, so a
 * webhook retry (or a race with the lazy fulfillment path) can never produce a
 * second shirt — Prodigi answers `AlreadyExists` and returns the first order.
 */
export async function createOrder(args: {
  item: LineItem;
  recipient: ProdigiRecipient;
  idempotencyKey: string;
  merchantReference: string;
  metadata?: Record<string, string | number>;
}): Promise<ProdigiOrderSummary & { outcome: string; issues?: unknown[] }> {
  const body = {
    merchantReference: args.merchantReference,
    shippingMethod: SHIPPING_METHOD,
    idempotencyKey: args.idempotencyKey,
    recipient: args.recipient,
    items: buildItems(args.item),
    metadata: args.metadata,
  };

  const response = await call<{
    outcome: string;
    issues?: unknown[];
    order: { id: string; status: { stage: string; [key: string]: unknown } };
  }>('/Orders', { method: 'POST', body });

  return {
    id: response.order.id,
    status: String(response.order.status?.stage ?? 'Unknown'),
    stage: String(response.order.status?.stage ?? 'Unknown'),
    outcome: response.outcome,
    issues: response.issues,
    details: response.order,
  };
}

/**
 * Cheapest authenticated read there is: look up one of our own catalog SKUs.
 * Used as the liveness probe, because it proves connectivity and that the API
 * key is valid without depending on quoting or order placement.
 */
export async function getProduct(
  sku: string,
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<{ sku: string; description?: string }> {
  const response = await call<{ product: { sku: string; description?: string } }>(
    `/products/${encodeURIComponent(sku)}`,
    opts,
  );
  return response.product;
}

export async function getOrder(id: string): Promise<ProdigiOrderSummary> {
  const response = await call<{
    order: { id: string; status: { stage: string }; [key: string]: unknown };
  }>(`/Orders/${encodeURIComponent(id)}`);
  return {
    id: response.order.id,
    status: String(response.order.status?.stage ?? 'Unknown'),
    stage: String(response.order.status?.stage ?? 'Unknown'),
    details: response.order,
  };
}
