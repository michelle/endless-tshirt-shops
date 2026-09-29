// Prodigi Print API client (v4.0). Sandbox keys (prefix "test_") route to the
// sandbox host automatically; anything else goes to live production.

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string;
}

export interface ProdigiAsset {
  printArea: string;
  url: string;
  md5Hash?: string;
}

export interface ProdigiItem {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
  attributes?: Record<string, string>;
  recipientCost?: { amount: string; currency: string };
  assets: ProdigiAsset[];
}

export interface ProdigiOrderRequest {
  merchantReference: string;
  idempotencyKey?: string;
  shippingMethod: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight';
  recipient: {
    name: string;
    email?: string;
    phoneNumber?: string;
    address: ProdigiAddress;
  };
  items: ProdigiItem[];
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  merchantReference: string;
  status: {
    stage: string;
    issues: unknown[];
    details: Record<string, string>;
  };
  shipments: {
    id: string;
    status: string;
    carrier?: { name?: string };
    tracking?: { url?: string; number?: string };
    fulfillmentLocation?: { countryCode?: string };
  }[];
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

export function prodigiBaseUrl(): string {
  return apiKey().startsWith('test_')
    ? 'https://api.sandbox.prodigi.com'
    : 'https://api.prodigi.com';
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${prodigiBaseUrl()}/v4.0${path}`, {
    ...init,
    headers: {
      'X-API-Key': apiKey(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Prodigi ${path} failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return JSON.parse(body) as T;
}

export interface CreateOrderResponse {
  outcome: string;
  order: ProdigiOrder;
}

export function createProdigiOrder(req: ProdigiOrderRequest): Promise<CreateOrderResponse> {
  return call<CreateOrderResponse>('/Orders', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function getProdigiOrder(id: string): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call(`/Orders/${encodeURIComponent(id)}`);
}
