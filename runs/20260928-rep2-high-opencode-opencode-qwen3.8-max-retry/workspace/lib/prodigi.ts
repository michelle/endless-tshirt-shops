/**
 * Prodigi Print API v4 (https://www.prodigi.com/print-api/docs/reference).
 * Sandbox by default; set PRODIGI_ENV=live to send real orders.
 */

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
};

export type ProdigiRecipient = {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address: ProdigiAddress;
};

export type ProdigiItem = {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
  attributes?: Record<string, string>;
  recipientCost?: { amount: string; currency: string };
  assets: { printArea: string; url: string }[];
};

export type ProdigiOrderRequest = {
  merchantReference?: string;
  idempotencyKey?: string;
  shippingMethod: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight';
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, unknown>;
};

export type ProdigiOrder = {
  id: string;
  created?: string;
  merchantReference?: string;
  shippingMethod?: string;
  status?: {
    stage: string;
    issues?: unknown[];
    details?: Record<string, string>;
  };
  shipments?: {
    id: string;
    status: string;
    carrier?: { name?: string } | null;
    dispatchDate?: string | null;
    tracking?: { url?: string; number?: string } | null;
    fulfillmentLocation?: { countryCode?: string } | null;
  }[];
  items?: {
    id: string;
    sku: string;
    copies: number;
    attributes?: Record<string, string>;
    status?: string;
    assets?: { url?: string; status?: string; thumbnailUrl?: string }[];
  }[];
};

export type ProdigiResponse = {
  outcome: string;
  order?: ProdigiOrder;
  orders?: ProdigiOrder[];
  debugDetails?: unknown;
};

function baseUrl(): string {
  return process.env.PRODIGI_ENV === 'live'
    ? 'https://api.prodigi.com'
    : 'https://api.sandbox.prodigi.com';
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not configured');
  return key;
}

async function request(path: string, init?: RequestInit): Promise<ProdigiResponse> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'X-API-Key': apiKey(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as ProdigiResponse;
  if (!res.ok) {
    throw new Error(`Prodigi ${path} failed (${res.status}): ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body;
}

export function createOrder(order: ProdigiOrderRequest): Promise<ProdigiResponse> {
  return request('/v4.0/Orders', { method: 'POST', body: JSON.stringify(order) });
}

export function getOrder(orderId: string): Promise<ProdigiResponse> {
  return request(`/v4.0/Orders/${encodeURIComponent(orderId)}`);
}
