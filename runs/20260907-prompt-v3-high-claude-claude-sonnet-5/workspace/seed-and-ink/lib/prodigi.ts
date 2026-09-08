// Minimal client for the Prodigi Print API v4 (sandbox by default).
// Docs: https://www.prodigi.com/print-api/docs/reference/

const BASE_URL =
  process.env.PRODIGI_API_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0';

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

export type ProdigiAddress = {
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
};

export type ProdigiOrderItem = {
  sku: string;
  copies: number;
  sizing: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
  merchantReference?: string;
};

export type CreateOrderInput = {
  merchantReference: string;
  idempotencyKey: string;
  recipient: {
    name: string;
    email?: string;
    phoneNumber?: string;
    address: ProdigiAddress;
  };
  items: ProdigiOrderItem[];
};

export type ProdigiOrderResult = {
  outcome: string;
  order?: { id: string; status?: { stage?: string } };
  raw: unknown;
};

export async function createProdigiOrder(
  input: CreateOrderInput,
): Promise<ProdigiOrderResult> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchantReference: input.merchantReference,
      idempotencyKey: input.idempotencyKey,
      shippingMethod: 'Standard',
      recipient: input.recipient,
      items: input.items,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `Prodigi order create failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }

  return {
    outcome: json.outcome,
    order: json.order,
    raw: json,
  };
}

export async function getProdigiOrder(orderId: string) {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: { 'X-API-Key': apiKey() },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Prodigi order fetch failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  return json;
}
