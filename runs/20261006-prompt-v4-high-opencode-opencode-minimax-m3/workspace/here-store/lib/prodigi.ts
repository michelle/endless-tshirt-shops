import { prodigiApiKey, prodigiBaseUrl } from './config';

export interface ProdigiOrderItem {
  sku: string;
  copies: number;
  /** Prodigi field name is `sizing`. Controls crop behaviour around the print area. */
  sizing: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
  attributes: Record<string, string>;
  recipientCost: { amount: string; currency: string };
  assets: Array<{ printArea: string; url: string }>;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
}

export interface ProdigiOrder {
  shippingMethod: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight';
  recipient: ProdigiRecipient;
  items: ProdigiOrderItem[];
  idempotencyKey: string;
  callbackUrl?: string;
  metadata?: { [k: string]: string };
}

async function prodigiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = prodigiBaseUrl();
  const key = prodigiApiKey();
  const headers = new Headers(init?.headers);
  headers.set('X-API-Key', key);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const url = `${base}${path}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!res.ok) {
    const detail = data?.issues?.map((i: any) => i?.description).filter(Boolean).join('; ')
      || data?.message || res.statusText;
    throw new Error(`Prodigi ${res.status} — ${detail}`);
  }
  return data as T;
}

export async function getProduct(sku: string): Promise<any> {
  return prodigiFetch(`/v4.0/products/${encodeURIComponent(sku)}`);
}

export async function createQuote(args: {
  destinationCountryCode: string;
  currencyCode?: string;
  items: Array<{
    sku: string;
    copies: number;
    attributes: Record<string, string>;
    assets: Array<{ printArea: string }>;
  }>;
}) {
  return prodigiFetch('/v4.0/quotes', {
    method: 'POST',
    body: JSON.stringify({
      destinationCountryCode: args.destinationCountryCode,
      currencyCode: args.currencyCode ?? 'USD',
      items: args.items,
    }),
  });
}

export async function createOrder(order: ProdigiOrder): Promise<any> {
  return prodigiFetch('/v4.0/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export async function getOrder(id: string): Promise<any> {
  return prodigiFetch(`/v4.0/orders/${encodeURIComponent(id)}`);
}

export function parseTotalCostUsd(quote: any, method: string): number | null {
  const q = quote?.quotes?.find((x: any) => x.shipmentMethod === method) ?? quote?.quotes?.[1] ?? quote?.quotes?.[0];
  return q?.costSummary?.totalCost?.amount ? Number(q.costSummary.totalCost.amount) : null;
}
