/**
 * Thin Scalable Press v2 client.
 *
 * The fulfillment path is three calls:
 *   1. POST /design  (multipart) -> designId
 *   2. POST /quote   -> orderToken + price breakdown (validates address & stock)
 *   3. POST /order   -> orderId  (this is the one that spends money)
 *
 * We quote *before* charging the customer, so an unfulfillable order never
 * results in a charge. Step 3 runs only after the PaymentIntent succeeds.
 */

import { PRINT, SIZES, STYLES, type Size, type Style } from './catalog';

const API = 'https://api.scalablepress.com/v2';

export class ScalablePressError extends Error {
  /** Message that is safe to show a customer. */
  readonly clientMessage: string;
  readonly issues: Array<{ message?: string }>;
  readonly status: number;

  constructor(
    operation: string,
    opts: { clientMessage?: string; issues?: Array<{ message?: string }>; status?: number } = {},
  ) {
    super(`${operation} failed`);
    this.name = 'ScalablePressError';
    this.clientMessage =
      opts.clientMessage || `${operation} could not be completed by our print partner.`;
    this.issues = opts.issues ?? [];
    this.status = opts.status ?? 502;
  }
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Quote {
  orderToken: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  fees: number;
  /** Business days until it ships, when Scalable Press tells us. */
  slaDays: number | null;
  warnings: string[];
}

function authHeader(): string {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error('SP_AUTH is not configured');
  // Scalable Press uses HTTP Basic with the API key as the password.
  return `Basic ${Buffer.from(`:${key}`).toString('base64')}`;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text.slice(0, 300) };
  }
}

function assertOk(operation: string, res: Response, body: Record<string, unknown>): void {
  const bodyStatus = typeof body.statusCode === 'number' ? body.statusCode : 0;
  if (!res.ok || bodyStatus >= 300) {
    throw new ScalablePressError(operation, {
      clientMessage: typeof body.message === 'string' ? body.message : undefined,
      issues: (body.issues ?? body.orderIssues ?? []) as Array<{ message?: string }>,
    });
  }
}

/** Uploads the rendered timestamp as a DTG design and returns its id. */
export async function createDesign(artwork: Buffer): Promise<string> {
  const form = new FormData();
  form.append('type', 'dtg');
  form.append(
    'sides[front][artwork]',
    new Blob([new Uint8Array(artwork)], { type: 'image/png' }),
    'artwork.png',
  );
  form.append('sides[front][dimensions][width]', String(PRINT.widthInches));
  form.append('sides[front][position][horizontal]', PRINT.horizontal);
  form.append('sides[front][position][offset][top]', String(PRINT.offsetTopInches));

  const res = await fetch(`${API}/design`, {
    method: 'POST',
    headers: { Authorization: authHeader() },
    body: form,
  });
  const body = await readJson(res);
  assertOk('Design creation', res, body);

  const designId = body.designId;
  if (typeof designId !== 'string') {
    throw new ScalablePressError('Design creation', {
      clientMessage: 'Our print partner returned an incomplete response. Nothing was charged.',
    });
  }
  return designId;
}

/** Prices and validates the order. Throws if it cannot be fulfilled as asked. */
export async function createQuote(args: {
  designId: string;
  style: Style;
  size: Size;
  address: ShippingAddress;
}): Promise<Quote> {
  const product = STYLES[args.style];
  const res = await fetch(`${API}/quote`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'dtg',
      products: [
        {
          id: product.productId,
          color: product.color,
          quantity: 1,
          size: SIZES[args.size],
        },
      ],
      designId: args.designId,
      address: args.address,
    }),
  });
  const body = await readJson(res);
  assertOk('Quote', res, body);

  const issues = (body.orderIssues ?? []) as Array<{ message?: string }>;
  if (issues.length) {
    throw new ScalablePressError('Quote', {
      clientMessage: 'We cannot ship this shirt as ordered. Nothing was charged.',
      issues,
      status: 422,
    });
  }

  const orderToken = body.orderToken;
  if (typeof orderToken !== 'string') {
    throw new ScalablePressError('Quote', {
      clientMessage: 'Our print partner returned an incomplete quote. Nothing was charged.',
    });
  }

  const sla = (body.sla ?? []) as Array<{ days?: number }>;
  return {
    orderToken,
    total: Number(body.total ?? 0),
    subtotal: Number(body.subtotal ?? 0),
    shipping: Number(body.shipping ?? 0),
    tax: Number(body.tax ?? 0),
    fees: Number(body.fees ?? 0),
    slaDays: typeof sla[0]?.days === 'number' ? sla[0].days : null,
    warnings: ((body.warnings ?? []) as unknown[]).map(String),
  };
}

/**
 * Submits the order for production.
 *
 * Guarded by SP_SUBMIT_ORDERS: the Scalable Press API has no test mode (it
 * reports `mode: "live"` even for this key), so submitting bills a real garment
 * to a real facility. Unset/false means dry run — the customer flow completes
 * and a synthetic order id is recorded so the rest of the pipeline is exercised.
 */
export async function submitOrder(orderToken: string): Promise<{ orderId: string; live: boolean }> {
  if (process.env.SP_SUBMIT_ORDERS !== 'true') {
    return { orderId: `dryrun_${orderToken}`, live: false };
  }

  const res = await fetch(`${API}/order`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken }),
  });
  const body = await readJson(res);
  assertOk('Order submission', res, body);

  const orderId = body.orderId;
  if (typeof orderId !== 'string') {
    throw new ScalablePressError('Order submission', {
      clientMessage: 'Your payment went through but the order id is missing. Contact support.',
    });
  }
  return { orderId, live: true };
}
