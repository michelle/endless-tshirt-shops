import {
  PRODIGI_PRODUCTS,
  PRODIGI_SIZES,
  ShirtSize,
  ShirtStyle,
} from './products';

const PRODIGI_API_URL =
  process.env.PRODIGI_API_URL || 'https://api.sandbox.prodigi.com/v4.0';

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error('PRODIGI_API_KEY is not set');
  return key;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
}

export interface ProdigiOrderResult {
  id: string;
  status: string;
  created: string;
}

export async function createProdigiOrder(params: {
  merchantReference: string;
  timestamp: string;
  style: ShirtStyle;
  size: ShirtSize;
  artworkUrl: string;
  recipient: ProdigiRecipient;
}): Promise<ProdigiOrderResult> {
  const product = PRODIGI_PRODUCTS[params.style];
  const body = {
    merchantReference: params.merchantReference,
    shippingMethod: 'Standard',
    recipient: params.recipient,
    items: [
      {
        merchantReference: `datetime-tee-${params.timestamp}`,
        sku: product.sku,
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: {
          color: product.color,
          size: PRODIGI_SIZES[params.size],
        },
        assets: [
          {
            printArea: 'front',
            url: params.artworkUrl,
          },
        ],
      },
    ],
    metadata: {
      timestamp: params.timestamp,
      style: params.style,
      size: params.size,
    },
  };

  const res = await fetch(`${PRODIGI_API_URL}/Orders`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload || payload.outcome?.toLowerCase() !== 'created') {
    throw new Error(
      `Prodigi order failed (HTTP ${res.status}): ${JSON.stringify(payload)}`
    );
  }

  return {
    id: payload.order.id,
    status: payload.order.status?.stage ?? 'InProgress',
    created: payload.order.created,
  };
}

export async function getProdigiOrder(
  orderId: string
): Promise<{ id: string; stage: string } | null> {
  const res = await fetch(`${PRODIGI_API_URL}/Orders/${orderId}`, {
    headers: { 'X-API-Key': apiKey() },
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  if (!payload?.order) return null;
  return { id: payload.order.id, stage: payload.order.status?.stage ?? 'Unknown' };
}
