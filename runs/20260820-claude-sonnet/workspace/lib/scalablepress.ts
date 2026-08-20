import { SCALABLE_PRESS_PRODUCTS, SCALABLE_PRESS_SIZES, ShirtSize, ShirtStyle } from './products';

const SP_API = 'https://api.scalablepress.com/v2/';

function auth(): string {
  const key = process.env.SP_AUTH;
  if (!key) {
    throw new Error('SP_AUTH is not configured');
  }
  return 'Basic ' + Buffer.from(`:${key}`).toString('base64');
}

export class ScalablePressError extends Error {
  issues?: unknown[];
  constructor(message: string, issues?: unknown[]) {
    super(message);
    this.issues = issues;
  }
}

async function spFetch(path: string, init: RequestInit) {
  const res = await fetch(`${SP_API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: auth(),
    },
  });
  const text = await res.text();
  let body: Record<string, unknown> | undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    const message = (body && (body.message as string)) || `Scalable Press request to ${path} failed (${res.status})`;
    throw new ScalablePressError(message, (body?.issues || body?.orderIssues) as unknown[] | undefined);
  }
  return body as Record<string, unknown>;
}

export async function createDesign(artworkPng: Buffer): Promise<string> {
  const form = new FormData();
  form.append('type', 'dtg');
  form.append('sides[front][artwork]', new Blob([new Uint8Array(artworkPng)], { type: 'image/png' }), 'artwork.png');
  form.append('sides[front][dimensions][width]', '8');
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', '3');

  const body = await spFetch('design', { method: 'POST', body: form });
  const designId = body.designId as string | undefined;
  if (!designId) {
    throw new ScalablePressError('Design creation returned no design ID');
  }
  return designId;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export async function createQuote(
  style: ShirtStyle,
  size: ShirtSize,
  designId: string,
  address: ShippingAddress,
): Promise<string> {
  const body = await spFetch('quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'dtg',
      products: [
        {
          id: SCALABLE_PRESS_PRODUCTS[style],
          color: 'Black',
          quantity: 1,
          size: SCALABLE_PRESS_SIZES[size],
        },
      ],
      designId,
      address,
    }),
  });
  const orderToken = body.orderToken as string | undefined;
  if (!orderToken) {
    throw new ScalablePressError('Quote creation returned no order token', body.orderIssues as unknown[] | undefined);
  }
  return orderToken;
}

export async function submitOrder(orderToken: string): Promise<string> {
  const body = await spFetch('order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderToken }),
  });
  const orderId = body.orderId as string | undefined;
  if (!orderId) {
    throw new ScalablePressError('Order submission returned no order ID');
  }
  return orderId;
}
