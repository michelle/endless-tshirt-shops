import { CURRENCY, PRICE_CENTS, PRODIGI_SKU } from './catalogue';
import { getBaseUrl } from './base-url';

const PRODIGI_BASE =
  process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0';

export type ProdigiRecipient = {
  name: string;
  email?: string | null;
  address: {
    line1: string;
    line2?: string | null;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string | null;
  };
};

export type FulfillmentInput = {
  stripeSessionId: string; // used as idempotency key + merchant reference
  word: string;
  paletteId: string;
  garmentColor: string;
  size: string;
  recipient: ProdigiRecipient;
};

export type ProdigiOrderResult = {
  id: string;
  stage: string;
};

export function artworkUrlFor(input: {
  word: string;
  paletteId: string;
  garmentColor: string;
}): string {
  const params = new URLSearchParams({
    word: input.word,
    palette: input.paletteId,
    garment: input.garmentColor,
  });
  return `${getBaseUrl()}/api/artwork?${params.toString()}`;
}

export async function createProdigiOrder(
  input: FulfillmentInput,
): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error('PRODIGI_API_KEY is not set');

  const payload = {
    merchantReference: input.stripeSessionId,
    idempotencyKey: input.stripeSessionId,
    shippingMethod: 'Standard',
    recipient: input.recipient,
    items: [
      {
        merchantReference: `seed-${input.word}`,
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: 'fitPrintArea',
        attributes: {
          color: input.garmentColor,
          size: input.size,
        },
        recipientCost: {
          amount: (PRICE_CENTS / 100).toFixed(2),
          currency: CURRENCY.toUpperCase(),
        },
        assets: [
          {
            printArea: 'front',
            url: artworkUrlFor(input),
          },
        ],
      },
    ],
    metadata: {
      store: 'seed',
      word: input.word,
      palette: input.paletteId,
      stripeSession: input.stripeSessionId,
    },
  };

  const res = await fetch(`${PRODIGI_BASE}/orders`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Prodigi order failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }
  const order = body?.order;
  if (!order?.id) {
    throw new Error(`Prodigi returned unexpected body: ${JSON.stringify(body)}`);
  }
  return { id: order.id as string, stage: order.status?.stage ?? 'Unknown' };
}

export async function getProdigiOrder(id: string): Promise<unknown> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error('PRODIGI_API_KEY is not set');
  const res = await fetch(`${PRODIGI_BASE}/orders/${id}`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) throw new Error(`Prodigi lookup failed (${res.status})`);
  return res.json();
}
