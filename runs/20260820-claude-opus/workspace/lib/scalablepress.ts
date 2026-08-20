/**
 * Scalable Press v2 client.
 *
 * The fulfillment flow is three calls:
 *   1. POST /design  (multipart, uploads the artwork)  -> designId
 *   2. POST /quote   (design + product + address)      -> orderToken + pricing
 *   3. POST /order   (orderToken)                      -> orderId
 *
 * Auth is HTTP basic with the API key as the *password* and an empty username.
 */

import { env } from './env';
import {
  SP_COLOR,
  SP_PRINT_TYPE,
  SP_PRODUCT_ID,
  SP_SIZE_CODE,
  type Size,
  type Style,
} from './catalog';

const SP_API = 'https://api.scalablepress.com/v2';

/** Print placement: 8" wide, centred, 3" down from the collar. */
const PRINT_WIDTH_INCHES = '8';
const PRINT_OFFSET_TOP_INCHES = '3';

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  email?: string;
}

export interface QuoteResult {
  /** Present only when Scalable Press returns an order-ready quote. */
  orderToken: string | null;
  total: number | null;
  subtotal: number | null;
  shipping: number | null;
  tax: number | null;
  fees: number | null;
  /** Structured, customer-safe problems reported by Scalable Press. */
  orderIssues: OrderIssue[];
}

export interface OrderIssue {
  code?: string;
  path?: string;
  message?: string;
}

/** An error that carries a message safe to show the customer. */
export class ScalablePressError extends Error {
  readonly clientMessage: string;
  readonly statusCode: number;
  readonly issues: OrderIssue[];
  readonly retryable: boolean;

  constructor(
    message: string,
    opts: {
      clientMessage?: string;
      statusCode?: number;
      issues?: OrderIssue[];
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = 'ScalablePressError';
    this.clientMessage =
      opts.clientMessage ?? 'Our print partner could not process this order right now.';
    this.statusCode = opts.statusCode ?? 502;
    this.issues = opts.issues ?? [];
    this.retryable = opts.retryable ?? false;
  }
}

function authHeader(): string {
  // Empty username, API key as password.
  return `Basic ${Buffer.from(`:${env.scalablePressAuth}`).toString('base64')}`;
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function asIssues(body: Record<string, unknown>): OrderIssue[] {
  const raw = body.orderIssues ?? body.issues;
  return Array.isArray(raw) ? (raw as OrderIssue[]) : [];
}

/**
 * Scalable Press signals failure both by HTTP status and by a `statusCode` in
 * the body, so check both.
 */
function assertOk(
  operation: string,
  response: Response,
  body: Record<string, unknown>,
): void {
  const bodyStatus = typeof body.statusCode === 'number' ? body.statusCode : 0;
  const failed = !response.ok || bodyStatus >= 300;
  if (!failed) return;

  const status = bodyStatus || response.status;
  const detail = typeof body.message === 'string' ? body.message : response.statusText;

  throw new ScalablePressError(`${operation} failed (${status}): ${detail}`, {
    clientMessage:
      status >= 500
        ? `Our print partner is temporarily unavailable (${operation.toLowerCase()}).`
        : detail || `${operation} could not be completed.`,
    statusCode: status,
    issues: asIssues(body),
    retryable: status >= 500 || status === 429,
  });
}

/** Step 1 — upload the artwork and create a design. */
export async function createDesign(artworkPng: Buffer): Promise<string> {
  const form = new FormData();
  form.append('type', SP_PRINT_TYPE);
  form.append(
    'sides[front][artwork]',
    new Blob([new Uint8Array(artworkPng)], { type: 'image/png' }),
    'datetime.png',
  );
  form.append('sides[front][dimensions][width]', PRINT_WIDTH_INCHES);
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', PRINT_OFFSET_TOP_INCHES);

  const response = await fetch(`${SP_API}/design`, {
    method: 'POST',
    headers: { Authorization: authHeader() },
    body: form,
  });

  const body = await parseJson(response);
  assertOk('Design creation', response, body);

  const designId = body.designId;
  if (typeof designId !== 'string' || !designId) {
    throw new ScalablePressError('Design creation returned no designId', {
      clientMessage: 'Our print partner returned an incomplete design response.',
      retryable: true,
    });
  }
  return designId;
}

/**
 * Step 2 — quote the order.
 *
 * `address` is optional: omitting it yields a quote-only response (pricing but
 * no `orderToken`), which is also the shape Scalable Press returns when it
 * cannot produce an order-ready quote.
 */
export async function createQuote(args: {
  designId: string;
  style: Style;
  size: Size;
  address?: ShippingAddress;
}): Promise<QuoteResult> {
  const payload: Record<string, unknown> = {
    type: SP_PRINT_TYPE,
    designId: args.designId,
    products: [
      {
        id: SP_PRODUCT_ID[args.style],
        color: SP_COLOR,
        size: SP_SIZE_CODE[args.size],
        quantity: 1,
      },
    ],
  };
  if (args.address) {
    payload.address = { country: 'US', ...args.address };
  }

  const response = await fetch(`${SP_API}/quote`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await parseJson(response);
  assertOk('Quote creation', response, body);

  const num = (key: string): number | null =>
    typeof body[key] === 'number' ? (body[key] as number) : null;

  return {
    orderToken: typeof body.orderToken === 'string' ? body.orderToken : null,
    total: num('total'),
    subtotal: num('subtotal'),
    shipping: num('shipping'),
    tax: num('tax'),
    fees: num('fees'),
    orderIssues: asIssues(body),
  };
}

/** Step 3 — submit the order for production. */
export async function submitOrder(orderToken: string): Promise<string> {
  const response = await fetch(`${SP_API}/order`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken }),
  });

  const body = await parseJson(response);
  assertOk('Order submission', response, body);

  const orderId = body.orderId;
  if (typeof orderId !== 'string' || !orderId) {
    throw new ScalablePressError('Order submission returned no orderId', {
      clientMessage: 'Our print partner returned an incomplete order response.',
      retryable: true,
    });
  }
  return orderId;
}
