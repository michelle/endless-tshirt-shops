// Minimal Prodigi Print API client (v4.0).
// Sandbox by default; point PRODIGI_API_BASE at https://api.prodigi.com/v4.0
// with a live key for production.

const DEFAULT_BASE = 'https://api.sandbox.prodigi.com/v4.0';

function base(): string {
  return (process.env.PRODIGI_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

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

export type ProdigiOrderResponse = {
  outcome: string;
  order?: {
    id: string;
    status?: { stage?: string };
    merchantReference?: string | null;
  };
  traceParent?: string;
  message?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      'X-API-Key': apiKey(),
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data: data as T };
}

export async function createProdigiOrder(payload: ProdigiOrderRequest): Promise<{ ok: boolean; status: number; data: ProdigiOrderResponse }> {
  return request<ProdigiOrderResponse>('/orders', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getProdigiOrder(id: string): Promise<{ ok: boolean; status: number; data: ProdigiOrderResponse }> {
  return request<ProdigiOrderResponse>(`/orders/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function getProduct(sku: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  return request(`/products/${encodeURIComponent(sku)}`, { method: 'GET' });
}

export function isSandbox(): boolean {
  return base().includes('sandbox');
}
