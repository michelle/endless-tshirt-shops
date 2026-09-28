// Prodigi Print API client (sandbox).
//
// The sandbox API lives at api.sandbox.prodigi.com and will not actually
// fulfil orders or charge the account — it is the correct target for this
// build. Switching to production is a one-line base-URL change.

const BASE_URL =
  process.env.PRODIGI_API_BASE_URL ?? 'https://api.sandbox.prodigi.com';

export interface ProdigiAddress {
  line1: string;
  line2?: string | null;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
}

export interface ProdigiRecipient {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address: ProdigiAddress;
}

export interface ProdigiAsset {
  printArea: string;
  url: string;
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
  shippingMethod: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight';
  idempotencyKey?: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface ProdigiOrder {
  id: string;
  merchantReference: string;
  status: { stage: string; issues: unknown[] };
  [key: string]: unknown;
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

export async function createOrder(
  order: ProdigiOrderRequest,
): Promise<ProdigiOrder> {
  const res = await fetch(`${BASE_URL}/v4.0/orders`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Prodigi createOrder failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }
  return body.order as ProdigiOrder;
}

export async function getOrder(id: string): Promise<ProdigiOrder> {
  const res = await fetch(`${BASE_URL}/v4.0/orders/${id}`, {
    headers: { 'X-API-Key': apiKey() },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Prodigi getOrder failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }
  return body.order as ProdigiOrder;
}
