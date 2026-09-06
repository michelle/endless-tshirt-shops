/**
 * Minimal Prodigi Print API v4.0 client.
 *
 * Prodigi replaces the Scalable Press flow the original store used. The big
 * practical difference: Scalable Press accepted an uploaded artwork buffer,
 * whereas Prodigi pulls artwork from a URL we host. That is why the print file
 * is generated on demand at /api/art/... rather than uploaded at checkout.
 */

import { PRODIGI_SKU, prodigiSize, type Size } from './catalog';

const SANDBOX_BASE = 'https://api.sandbox.prodigi.com/v4.0';
const LIVE_BASE = 'https://api.prodigi.com/v4.0';

/** Sandbox keys are prefixed `test_`; anything else is treated as live. */
function baseUrl(apiKey: string): string {
  return apiKey.startsWith('test_') ? SANDBOX_BASE : LIVE_BASE;
}

export function prodigiApiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

export function isSandbox(): boolean {
  return prodigiApiKey().startsWith('test_');
}

export type ProdigiAddress = {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string;
};

export type ProdigiOrder = {
  id: string;
  status?: { stage?: string; details?: Record<string, string> };
};

export type CreateOrderInput = {
  merchantReference: string;
  idempotencyKey: string;
  recipient: { name: string; email?: string; phoneNumber?: string; address: ProdigiAddress };
  size: Size;
  colour: string;
  artworkUrl: string;
  metadata?: Record<string, string>;
};

async function prodigiFetch(path: string, init: RequestInit): Promise<unknown> {
  const key = prodigiApiKey();
  const res = await fetch(`${baseUrl(key)}${path}`, {
    ...init,
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    cache: 'no-store',
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Prodigi ${path} returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(`Prodigi ${path} failed (${res.status}): ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

/**
 * Places the order. `sizing: 'fillPrintArea'` is safe because the artwork
 * canvas is generated at the print area's exact aspect ratio, so nothing is
 * cropped.
 */
export async function createProdigiOrder(input: CreateOrderInput): Promise<ProdigiOrder> {
  const payload = {
    merchantReference: input.merchantReference,
    shippingMethod: 'Budget',
    idempotencyKey: input.idempotencyKey,
    recipient: input.recipient,
    items: [
      {
        merchantReference: input.merchantReference,
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { color: input.colour, size: prodigiSize(input.size) },
        assets: [{ printArea: 'front', url: input.artworkUrl }],
      },
    ],
    metadata: input.metadata,
  };

  const body = (await prodigiFetch('/Orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as { outcome?: string; order?: ProdigiOrder };

  if (!body.order?.id) {
    throw new Error(`Prodigi order not created: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body.order;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const body = (await prodigiFetch(`/Orders/${encodeURIComponent(id)}`, { method: 'GET' })) as {
      order?: ProdigiOrder;
    };
    return body.order ?? null;
  } catch {
    return null;
  }
}
