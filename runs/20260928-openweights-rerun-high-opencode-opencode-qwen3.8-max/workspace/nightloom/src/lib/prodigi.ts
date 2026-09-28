// Prodigi Print API v4 client (orders + lookups).
// Sandbox keys (test_...) talk to api.sandbox.prodigi.com; live keys to api.prodigi.com.

import {
  CURRENCY,
  PRODIGI_PRINT_AREA,
  PRODIGI_SKU,
  SHIRT_PRICE_CENTS,
} from './product';
import { centsToStr } from './format';
import type { OrderPayload } from './types';

export const prodigiIsSandbox = (): boolean =>
  process.env.PRODIGI_ENVIRONMENT
    ? process.env.PRODIGI_ENVIRONMENT === 'sandbox'
    : (process.env.PRODIGI_API_KEY || '').startsWith('test_');

export function prodigiBaseUrl(): string {
  if (process.env.PRODIGI_API_URL) return process.env.PRODIGI_API_URL.replace(/\/$/, '');
  return prodigiIsSandbox() ? 'https://api.sandbox.prodigi.com' : 'https://api.prodigi.com';
}

export interface ProdigiOrderResponse {
  outcome: string;
  order?: {
    id: string;
    status?: { stage: string; issues?: unknown[]; details?: Record<string, string> };
    merchantReference?: string;
    shipments?: {
      id?: string;
      status?: string;
      tracking?: { url?: string; number?: string } | null;
      carrier?: { name?: string; service?: string } | null;
    }[];
    items?: { sku?: string; status?: string }[];
  };
  orders?: ProdigiOrderResponse['order'][];
  errors?: unknown;
  [key: string]: unknown;
}

async function prodigiFetch(path: string, init?: RequestInit): Promise<ProdigiOrderResponse> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not configured');
  const res = await fetch(`${prodigiBaseUrl()}/v4.0${path}`, {
    ...init,
    signal: AbortSignal.timeout(25000),
    headers: {
      'X-API-Key': key,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let body: ProdigiOrderResponse;
  try {
    body = text ? JSON.parse(text) : ({} as ProdigiOrderResponse);
  } catch {
    throw new Error(`Prodigi returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`Prodigi HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return body;
}

/** Build the Prodigi create-order payload for a paid Nightloom order. */
export function buildProdigiOrder(order: OrderPayload, assetUrl: string) {
  const { design, product, shipping } = order;
  return {
    merchantReference: order.orderRef,
    idempotencyKey: `nightloom-${order.attemptId}`,
    shippingMethod: 'Standard',
    recipient: {
      name: shipping.fullName,
      email: shipping.email,
      address: {
        line1: shipping.line1,
        line2: shipping.line2 ?? null,
        postalOrZipCode: shipping.postalCode,
        countryCode: shipping.country,
        townOrCity: shipping.city,
        stateOrCounty: shipping.state ?? null,
      },
    },
    items: [
      {
        merchantReference: `${order.orderRef}-1`,
        sku: PRODIGI_SKU,
        copies: product.qty,
        sizing: 'fillPrintArea',
        attributes: { color: product.color, size: product.size },
        recipientCost: {
          amount: centsToStr(SHIRT_PRICE_CENTS * product.qty),
          currency: CURRENCY,
        },
        assets: [
          {
            printArea: PRODIGI_PRINT_AREA,
            url: assetUrl,
          },
        ],
      },
    ],
    metadata: {
      store: 'nightloom',
      design: {
        name: design.name,
        date: design.date,
        time: design.time,
        lat: design.lat,
        lng: design.lng,
        palette: design.palette,
        place: design.placeLabel,
      },
    },
  };
}

export async function createProdigiOrder(
  order: OrderPayload,
  assetUrl: string
): Promise<ProdigiOrderResponse> {
  return prodigiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(buildProdigiOrder(order, assetUrl)),
  });
}

export async function findProdigiOrders(
  merchantReference: string
): Promise<ProdigiOrderResponse> {
  const ref = encodeURIComponent(merchantReference);
  return prodigiFetch(`/orders?merchantReferences=${ref}&top=5`);
}
