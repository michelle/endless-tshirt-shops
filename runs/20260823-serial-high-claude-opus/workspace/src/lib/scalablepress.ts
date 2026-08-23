import { PRINT, SP_PRODUCTS, SP_SIZES, type ShirtSize, type ShirtStyle } from './catalog';
import { renderArtworkPng } from './artwork';

/**
 * Thin client for the Scalable Press v2 print-on-demand API.
 *
 * The order lifecycle is three calls:
 *
 *   1. POST /design  — upload the artwork, get a designId
 *   2. POST /quote   — price it for a specific product + shipping address,
 *                      get an orderToken (and any blocking orderIssues)
 *   3. POST /order   — redeem the orderToken, which actually places the order
 *
 * We deliberately split (1)+(2) from (3): the first two happen *before* we take
 * the customer's money, so a bad address or an out-of-stock blank never results
 * in a charge. (3) happens only after the payment succeeds.
 */

const SP_API = process.env.SP_API_BASE ?? 'https://api.scalablepress.com/v2';

export type SpAddress = {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email?: string;
  phone?: string;
};

export type SpIssue = { code?: string; path?: string; message?: string };

/**
 * How a call failed. `validation` means the request was understood and rejected
 * (surface it to the customer, don't charge). `unavailable` means Scalable Press
 * itself is having a bad day (retry later, don't lose the sale).
 */
export type SpFailureKind = 'validation' | 'unavailable';

export class ScalablePressError extends Error {
  readonly kind: SpFailureKind;
  readonly status: number;
  readonly issues: SpIssue[];

  constructor(message: string, kind: SpFailureKind, status: number, issues: SpIssue[] = []) {
    super(message);
    this.name = 'ScalablePressError';
    this.kind = kind;
    this.status = status;
    this.issues = issues;
  }
}

function authHeader(): string {
  const key = process.env.SP_AUTH;
  if (!key) throw new Error('SP_AUTH is not configured');
  // The key goes in the password slot of HTTP basic auth, with an empty user.
  return 'Basic ' + Buffer.from(`:${key}`).toString('base64');
}

/**
 * Note the 500: Scalable Press reports some *permanent* input problems with a
 * 500 too (an unknown product id comes back as `500 Unable to find product x`),
 * so treating 500 as retryable means a genuine misconfiguration gets retried
 * before it is reported. That is the trade we want — a real outage is far more
 * likely than a bad product id, since the catalog is verified by
 * `scripts/verify-products.mjs` rather than by customer traffic.
 */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 522, 524]);

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type SpRequest = {
  path: string;
  method?: 'GET' | 'POST';
  json?: unknown;
  form?: FormData;
  /** Total attempts, including the first. */
  attempts?: number;
  timeoutMs?: number;
};

async function spFetch<T>({
  path,
  method = 'POST',
  json,
  form,
  attempts = 4,
  timeoutMs = 20_000,
}: SpRequest): Promise<T> {
  let lastError: ScalablePressError | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const headers: Record<string, string> = { Authorization: authHeader() };
    if (json !== undefined) headers['Content-Type'] = 'application/json';

    let res: Response;
    try {
      res = await fetch(`${SP_API}${path}`, {
        method,
        headers,
        body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      });
    } catch (cause) {
      lastError = new ScalablePressError(
        `Scalable Press ${path} did not respond: ${(cause as Error).message}`,
        'unavailable',
        0,
      );
      if (attempt < attempts) await sleep(400 * 2 ** (attempt - 1));
      continue;
    }

    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      // Scalable Press serves an HTML "we are experiencing heavy load" page when
      // it sheds traffic, so a non-JSON body is itself an availability signal.
      body = { message: text.slice(0, 200) };
    }

    if (res.ok) return body as T;

    const record = (body ?? {}) as { message?: string; issues?: SpIssue[] };
    const kind: SpFailureKind = RETRYABLE_STATUS.has(res.status) ? 'unavailable' : 'validation';
    lastError = new ScalablePressError(
      record.message || `Scalable Press ${path} failed with ${res.status}`,
      kind,
      res.status,
      record.issues ?? [],
    );

    if (kind === 'unavailable' && attempt < attempts) {
      await sleep(400 * 2 ** (attempt - 1));
      continue;
    }
    throw lastError;
  }

  throw lastError ?? new ScalablePressError('Scalable Press request failed', 'unavailable', 0);
}

export type SpDesign = {
  designId: string;
  /** A rendered mockup/proof URL when Scalable Press provides one. */
  proofUrl?: string;
  artworkUrl?: string;
  mode?: string;
};

/**
 * Renders the timestamp artwork and uploads it as a DTG design, front print only.
 */
export async function createDesign(timestampMs: number): Promise<SpDesign> {
  const artwork = renderArtworkPng(timestampMs);

  const form = new FormData();
  form.append('type', 'dtg');
  form.append('sides[front][artwork]', new Blob([new Uint8Array(artwork.png)], { type: 'image/png' }), 'artwork.png');
  form.append('sides[front][dimensions][width]', String(PRINT.widthInches));
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', String(PRINT.topOffsetInches));

  const body = await spFetch<{
    designId: string;
    mode?: string;
    sides?: { front?: { artwork?: string; proof?: string } };
  }>({ path: '/design', form, timeoutMs: 45_000 });

  if (!body.designId) {
    throw new ScalablePressError('Scalable Press did not return a designId', 'unavailable', 200);
  }

  return {
    designId: body.designId,
    proofUrl: body.sides?.front?.proof,
    artworkUrl: body.sides?.front?.artwork,
    mode: body.mode,
  };
}

export type SpQuote = {
  orderToken: string | null;
  /** Wholesale cost to us, in cents. */
  totalCents: number;
  breakdown: { blanksCents: number; printingCents: number; shippingCents: number; taxCents: number };
  orderIssues: SpIssue[];
  warnings: SpIssue[];
  mode?: string;
  slaDays: number | null;
};

function dollarsToCents(value: unknown): number {
  const n = typeof value === 'number' ? value : 0;
  return Math.round(n * 100);
}

export async function createQuote(params: {
  designId: string;
  style: ShirtStyle;
  size: ShirtSize;
  address: SpAddress;
}): Promise<SpQuote> {
  const product = SP_PRODUCTS[params.style];

  const body = await spFetch<{
    total?: number;
    orderToken?: string | null;
    orderIssues?: SpIssue[];
    warnings?: SpIssue[];
    mode?: string;
    breakdown?: Array<{ blanks?: number; printing?: number; shipping?: number; tax?: number }>;
    sla?: Array<{ days?: number } | null>;
  }>({
    path: '/quote',
    json: {
      type: 'dtg',
      designId: params.designId,
      products: [
        {
          id: product.id,
          color: product.color,
          size: SP_SIZES[params.size],
          quantity: 1,
        },
      ],
      address: params.address,
    },
    timeoutMs: 30_000,
  });

  const line = body.breakdown?.[0] ?? {};
  return {
    orderToken: body.orderToken ?? null,
    totalCents: dollarsToCents(body.total),
    breakdown: {
      blanksCents: dollarsToCents(line.blanks),
      printingCents: dollarsToCents(line.printing),
      shippingCents: dollarsToCents(line.shipping),
      taxCents: dollarsToCents(line.tax),
    },
    orderIssues: body.orderIssues ?? [],
    warnings: body.warnings ?? [],
    mode: body.mode,
    slaDays: body.sla?.[0]?.days ?? null,
  };
}

export type SpOrder = { orderId: string; mode?: string };

/** Redeems an orderToken. This is the call that spends money with the printer. */
export async function placeOrder(orderToken: string): Promise<SpOrder> {
  const body = await spFetch<{ orderId?: string; mode?: string; issues?: SpIssue[] }>({
    path: '/order',
    json: { orderToken },
    timeoutMs: 45_000,
  });

  if (!body.orderId) {
    throw new ScalablePressError(
      'Scalable Press accepted the order but returned no orderId',
      'unavailable',
      200,
      body.issues ?? [],
    );
  }
  return { orderId: body.orderId, mode: body.mode };
}

export type SpOrderStatus = {
  orderId: string;
  status?: string;
  issues?: SpIssue[];
  raw: unknown;
};

export async function getOrder(orderId: string): Promise<SpOrderStatus> {
  const body = await spFetch<{ orderId?: string; status?: string; issues?: SpIssue[] }>({
    path: `/order/${encodeURIComponent(orderId)}`,
    method: 'GET',
    json: undefined,
    attempts: 2,
  });
  return { orderId: body.orderId ?? orderId, status: body.status, issues: body.issues, raw: body };
}
