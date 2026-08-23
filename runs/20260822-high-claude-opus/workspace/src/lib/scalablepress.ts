/**
 * Scalable Press v2 client.
 *
 * Three calls make a shirt: upload the artwork to get a design, quote the
 * design against a product and a shipping address, then place the order with
 * the quote's token. Auth is HTTP basic with the API key as the password.
 */

import {
  GARMENT_COLOR,
  SP_PRODUCTS,
  SP_SIZES,
  type ShirtSize,
  type ShirtStyle,
} from './catalog';
import { PRINT_WIDTH_INCHES } from './artwork';

const SP_API = 'https://api.scalablepress.com/v2/';

export type ShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export class ScalablePressError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** Issues Scalable Press raises against the order — usually a bad address. */
  readonly issues: string[];

  constructor(message: string, status: number, body: unknown, issues: string[] = []) {
    super(message);
    this.name = 'ScalablePressError';
    this.status = status;
    this.body = body;
    this.issues = issues;
  }
}

function authHeader(): string {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error('SP_AUTH is not configured.');
  return `Basic ${Buffer.from(`:${key}`).toString('base64')}`;
}

/** Scalable Press reports some failures in the body with a 200-ish status. */
function extractIssues(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const raw = (body as Record<string, unknown>).orderIssues ?? (body as Record<string, unknown>).issues;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((issue) => {
      if (typeof issue === 'string') return issue;
      if (issue && typeof issue === 'object') {
        const m = (issue as Record<string, unknown>).message;
        if (typeof m === 'string') return m;
      }
      return null;
    })
    .filter((m): m is string => Boolean(m));
}

function assertOk(body: unknown, status: number, label: string): void {
  const issues = extractIssues(body);
  const statusCode =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).statusCode
      : undefined;
  const message =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).message
      : undefined;

  const failed =
    status >= 300 ||
    (typeof statusCode === 'number' && statusCode >= 300) ||
    issues.length > 0;

  if (failed) {
    throw new ScalablePressError(
      issues[0] ??
        (typeof message === 'string' ? message : `${label} failed (${status}).`),
      typeof statusCode === 'number' ? statusCode : status,
      body,
      issues,
    );
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Upload print artwork and return the design id.
 *
 * Design creation is the flakiest of the three calls, so it retries — the
 * original store did the same.
 */
export async function createDesign(
  artwork: Buffer,
  { attempts = 3 }: { attempts?: number } = {},
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const form = new FormData();
    form.append('type', 'dtg');
    form.append(
      'sides[front][artwork]',
      new Blob([new Uint8Array(artwork)], { type: 'image/png' }),
      'artwork.png',
    );
    form.append('sides[front][dimensions][width]', String(PRINT_WIDTH_INCHES));
    form.append('sides[front][position][horizontal]', 'C');
    form.append('sides[front][position][offset][top]', '3');

    try {
      const res = await fetch(`${SP_API}design`, {
        method: 'POST',
        headers: { Authorization: authHeader() },
        body: form,
      });
      const body = await parse(res);
      assertOk(body, res.status, 'Design upload');

      const designId = (body as Record<string, unknown>).designId;
      if (typeof designId !== 'string') {
        throw new ScalablePressError('Design upload returned no id.', 502, body);
      }
      return designId;
    } catch (err) {
      lastError = err;
      // A rejected artwork will be rejected again; only retry transient faults.
      if (err instanceof ScalablePressError && err.status < 500 && err.issues.length) {
        throw err;
      }
      if (attempt < attempts) await sleep(400 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new ScalablePressError('Design upload failed.', 502, lastError);
}

export type Quote = {
  orderToken: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  fees: number;
  mode?: string;
};

/** Price a design against a product and address; returns the order token. */
export async function createQuote(input: {
  designId: string;
  style: ShirtStyle;
  size: ShirtSize;
  address: ShippingAddress;
}): Promise<Quote> {
  const res = await fetch(`${SP_API}quote`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'dtg',
      designId: input.designId,
      products: [
        {
          id: SP_PRODUCTS[input.style],
          color: GARMENT_COLOR,
          quantity: 1,
          size: SP_SIZES[input.size],
        },
      ],
      address: input.address,
    }),
  });

  const body = await parse(res);
  assertOk(body, res.status, 'Quote');

  const b = body as Record<string, unknown>;
  if (typeof b.orderToken !== 'string') {
    throw new ScalablePressError('Quote returned no order token.', 502, body);
  }

  return {
    orderToken: b.orderToken,
    total: Number(b.total ?? 0),
    subtotal: Number(b.subtotal ?? 0),
    shipping: Number(b.shipping ?? 0),
    tax: Number(b.tax ?? 0),
    fees: Number(b.fees ?? 0),
    mode: typeof b.mode === 'string' ? b.mode : undefined,
  };
}

export type PlacedOrder = {
  orderToken: string;
  /** True when this call found the order already placed rather than placing it. */
  alreadyPlaced: boolean;
  status?: string;
  total?: number;
};

/**
 * Place a quoted order. Safe to call more than once: Scalable Press rejects a
 * second placement with "already in state", which we report as success so
 * webhook and client-side fulfillment can race harmlessly.
 */
export async function placeOrder(orderToken: string): Promise<PlacedOrder> {
  const res = await fetch(`${SP_API}order`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken }),
  });

  const body = await parse(res);
  const b = (body ?? {}) as Record<string, unknown>;
  const message = typeof b.message === 'string' ? b.message : '';

  if (/already in state/i.test(message)) {
    return { orderToken, alreadyPlaced: true };
  }

  assertOk(body, res.status, 'Order');

  return {
    orderToken: typeof b.orderToken === 'string' ? b.orderToken : orderToken,
    alreadyPlaced: false,
    status: typeof b.status === 'string' ? b.status : undefined,
    total: typeof b.total === 'number' ? b.total : undefined,
  };
}
