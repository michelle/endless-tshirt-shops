import { PRINT, STYLE_SPECS, SP_SIZE_CODES, type ShirtSize, type ShirtStyle } from './catalog';
import type { ShippingAddress } from './schema';
import { log } from './log';

const SP_BASE = process.env.SP_API_BASE ?? 'https://api.scalablepress.com/v2';

/** An error from Scalable Press, carrying whatever issue list they gave us. */
export class ScalablePressError extends Error {
  readonly status: number;
  readonly issues: SpIssue[];
  readonly step: string;

  constructor(step: string, status: number, message: string, issues: SpIssue[] = []) {
    super(message);
    this.name = 'ScalablePressError';
    this.step = step;
    this.status = status;
    this.issues = issues;
  }

  /** A message safe to show a customer. */
  get customerMessage(): string {
    const fromIssues = this.issues.map((i) => i.message).filter(Boolean);
    if (fromIssues.length) return fromIssues.join(' ');
    if (this.status >= 500) {
      return 'Our print partner is having trouble right now. Please try again in a moment.';
    }
    return this.message;
  }
}

export type SpIssue = { code?: string; path?: string; message?: string };

export type SpQuote = {
  total: number;
  subtotal: number;
  tax: number;
  fees: number;
  shipping: number;
  orderToken: string | null;
  issues?: SpIssue[];
  orderIssues?: SpIssue[];
  warnings?: SpIssue[];
  mode?: 'test' | 'live';
  sla?: ({ days?: number } | null)[];
};

export type SpOrder = {
  orderId?: string;
  orderToken?: string;
  status?: string;
  total?: number;
  mode?: 'test' | 'live';
  events?: { name: string; description: string; createdAt: string }[];
};

function authHeader(): string {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error('SP_AUTH is not configured');
  // Scalable Press uses HTTP basic auth with the API key as the password.
  return 'Basic ' + Buffer.from(':' + key).toString('base64');
}

/** Scalable Press occasionally returns a bare 500; retry idempotent reads/creates. */
async function withRetry<T>(step: string, attempts: number, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = err instanceof ScalablePressError && err.status >= 500;
      if (!retryable || attempt === attempts) break;
      const backoffMs = 250 * 2 ** (attempt - 1);
      log.warn('sp.retry', { step, attempt, backoffMs, message: (err as Error).message });
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastError;
}

async function parse(step: string, res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ScalablePressError(step, res.status, `Unparseable response from Scalable Press`);
  }
  // Scalable Press signals failure with a `statusCode` field even on HTTP 200.
  const declared = typeof body.statusCode === 'number' ? (body.statusCode as number) : res.status;
  if (declared >= 300 || !res.ok) {
    throw new ScalablePressError(
      step,
      declared,
      (body.message as string) ?? `Scalable Press ${step} failed (${declared})`,
      [
        ...((body.issues as SpIssue[]) ?? []),
        ...((body.orderIssues as SpIssue[]) ?? []),
      ],
    );
  }
  return body;
}

/**
 * Upload the artwork and create a DTG design. Designs are immutable, so each
 * purchase gets its own — which is exactly right here, since every shirt has a
 * different timestamp on it.
 */
export async function createDesign(artwork: Buffer): Promise<string> {
  return withRetry('design', 3, async () => {
    const form = new FormData();
    form.append('type', 'dtg');
    form.append(
      'sides[front][artwork]',
      new Blob([new Uint8Array(artwork)], { type: 'image/png' }),
      'artwork.png',
    );
    form.append('sides[front][dimensions][width]', String(PRINT.widthInches));
    form.append('sides[front][position][horizontal]', 'C');
    form.append('sides[front][position][offset][top]', String(PRINT.topOffsetInches));

    const res = await fetch(`${SP_BASE}/design`, {
      method: 'POST',
      headers: { Authorization: authHeader() },
      body: form,
    });
    const body = await parse('design', res);
    const designId = body.designId as string | undefined;
    if (!designId) throw new ScalablePressError('design', 502, 'No designId returned');
    return designId;
  });
}

export type QuoteInput = {
  designId: string;
  style: ShirtStyle;
  size: ShirtSize;
  address: ShippingAddress;
  email: string;
  /** Reference name that shows up on the Scalable Press order. */
  reference: string;
};

/**
 * Price the order and validate the shipping address. A quote that comes back
 * with an `orderToken` is order-ready; we deliberately do this *before* taking
 * the customer's money so a bad address fails cheaply.
 */
export async function createQuote(input: QuoteInput): Promise<SpQuote & { orderToken: string }> {
  const spec = STYLE_SPECS[input.style];
  const quote = await withRetry('quote', 3, async () => {
    const res = await fetch(`${SP_BASE}/quote`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'dtg',
        name: input.reference,
        designId: input.designId,
        products: [
          {
            id: spec.productId,
            color: spec.color,
            size: SP_SIZE_CODES[input.size],
            quantity: 1,
          },
        ],
        address: {
          name: input.address.name,
          address1: input.address.address1,
          ...(input.address.address2 ? { address2: input.address.address2 } : {}),
          city: input.address.city,
          state: input.address.state,
          zip: input.address.zip,
          country: input.address.country,
          email: input.email,
        },
      }),
    });
    return (await parse('quote', res)) as unknown as SpQuote;
  });

  const blockingIssues = [...(quote.issues ?? []), ...(quote.orderIssues ?? [])];
  if (!quote.orderToken) {
    throw new ScalablePressError(
      'quote',
      400,
      'We could not price this order. Please check your shipping address.',
      blockingIssues,
    );
  }
  return quote as SpQuote & { orderToken: string };
}

export type PlaceOrderResult =
  | { placed: true; order: SpOrder }
  /**
   * Scalable Press rejects a second submission of the same `orderToken` with
   * "Order is already in state: 'order'". That makes the token a natural
   * idempotency key: a duplicate call can never create a second shirt. We
   * report it separately so the caller can go find the ID it already recorded
   * rather than treating it as a failure.
   */
  | { placed: false; alreadyPlaced: true };

export async function placeOrder(orderToken: string): Promise<PlaceOrderResult> {
  const res = await fetch(`${SP_BASE}/order`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken }),
  });

  try {
    return { placed: true, order: (await parse('order', res)) as unknown as SpOrder };
  } catch (err) {
    if (err instanceof ScalablePressError && isAlreadyPlaced(err)) {
      log.info('sp.order.already_placed', { orderToken });
      return { placed: false, alreadyPlaced: true };
    }
    throw err;
  }
}

export function isAlreadyPlaced(err: ScalablePressError): boolean {
  return /already in state/i.test(err.message);
}

/**
 * Recover the `orderId` for a token we already placed.
 *
 * `GET /order/{orderToken}` returns a 500 — only an `orderId` works there — so we
 * page the order list and match on the token instead. This is the authoritative
 * answer to "did this token become an order, and which one?", which matters when
 * we placed an order but then lost the ID (e.g. the write back to Stripe failed).
 * Returns null if the token has no order.
 */
export async function findOrderIdByToken(orderToken: string, pages = 2): Promise<string | null> {
  // `limit=25` answers in tens of milliseconds; `limit=50` hangs for over 45
  // seconds. Keep the page small, and time each request out regardless so a slow
  // printer can never hold a request open until the platform kills it.
  const perPage = 25;
  for (let page = 0; page < pages; page++) {
    const res = await fetch(`${SP_BASE}/order?limit=${perPage}&skip=${page * perPage}`, {
      headers: { Authorization: authHeader() },
      signal: AbortSignal.timeout(8000),
    });
    const body = (await parse('order.list', res)) as unknown;
    const orders = Array.isArray(body) ? (body as SpOrder[]) : [];
    const hit = orders.find((o) => o.orderToken === orderToken);
    if (hit?.orderId) return hit.orderId;
    if (orders.length < perPage) break; // last page
  }
  return null;
}

/** Look an order up. Note that Scalable Press only accepts an `orderId` here — not an `orderToken`. */
export async function getOrder(orderId: string): Promise<SpOrder> {
  const res = await fetch(`${SP_BASE}/order/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: authHeader() },
  });
  return (await parse('order.get', res)) as unknown as SpOrder;
}
