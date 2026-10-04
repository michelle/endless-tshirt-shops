/**
 * Thin Prodigi Print API client.
 *
 * Production notes:
 * - We submit an `Order` immediately after Stripe payment succeeds.
 * - The order references our generated PNG via a public HTTPS URL.
 *   In this project we serve the PNG from our own /api/asset/[orderId] route
 *   which returns the print-ready PNG with a long cache and stable URL.
 * - When `LIVE_PRODIGI=1` we hit the live API; otherwise sandbox.
 */
import type { Product } from './products';

const SANDBOX_URL = 'https://api.sandbox.prodigi.com/v4.0';
const LIVE_URL = 'https://api.prodigi.com/v4.0';

export interface PlaceOrderInput {
  product: Product;
  colorValue: string;
  sizeValue: string;
  copies: number;
  recipient: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      townOrCity: string;
      stateOrCounty?: string;
      postalOrZipCode: string;
      countryCode: string;
    };
  };
  /** Absolute URL Prodigi can fetch the print-ready PNG from */
  assetUrl: string;
  merchantReference: string;
  shippingMethod?: 'Budget' | 'Standard' | 'StandardPlus' | 'Express' | 'Overnight';
  unitCostUsd: number;
}

export interface PlaceOrderResult {
  outcome: string;
  orderId: string;
  raw: unknown;
}

function getBaseUrl() {
  // Force sandbox unless an explicit LIVE_PRODIGI flag is set.
  return process.env.LIVE_PRODIGI === '1' ? LIVE_URL : SANDBOX_URL;
}

function getApiKey(): string {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) {
    throw new Error(
      'PRODIGI_API_KEY is not set. Add it to your .env.local. ' +
        'A sandbox key can be obtained for free at dashboard.prodigi.com.'
    );
  }
  return k;
}

export async function placeProdigiOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const body = {
    merchantReference: input.merchantReference,
    shippingMethod: input.shippingMethod ?? 'Standard',
    recipient: {
      name: input.recipient.name,
      email: input.recipient.email,
      phoneNumber: input.recipient.phone,
      address: {
        line1: input.recipient.address.line1,
        line2: input.recipient.address.line2,
        postalOrZipCode: input.recipient.address.postalOrZipCode,
        countryCode: input.recipient.address.countryCode,
        townOrCity: input.recipient.address.townOrCity,
        stateOrCounty: input.recipient.address.stateOrCounty ?? null,
      },
    },
    items: [
      {
        merchantReference: `item-${input.merchantReference}`,
        sku: input.product.sku,
        copies: input.copies,
        sizing: 'fillPrintArea',
        attributes: {
          color: input.colorValue,
          size: input.sizeValue,
        },
        recipientCost: {
          amount: input.unitCostUsd.toFixed(2),
          currency: 'USD',
        },
        assets: [
          {
            printArea: 'front',
            url: input.assetUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${getBaseUrl()}/Orders`, {
    method: 'POST',
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = await res.json();

  if (!res.ok || (json?.outcome && !['Created', 'CreatedWithIssues', 'OnHold'].includes(json.outcome))) {
    throw new ProdigiError(
      `Prodigi rejected the order (HTTP ${res.status}): ${JSON.stringify(json)}`,
      res.status,
      json
    );
  }

  return {
    outcome: json.outcome,
    orderId: json?.order?.id ?? 'unknown',
    raw: json,
  };
}

export class ProdigiError extends Error {
  constructor(message: string, public status: number, public payload: unknown) {
    super(message);
    this.name = 'ProdigiError';
  }
}

/** Ping Prodigi to confirm our key is alive and SKU is valid. */
export async function pingProdigi() {
  const res = await fetch(`${getBaseUrl()}/orders?top=1`, {
    headers: { 'X-API-Key': getApiKey() },
    cache: 'no-store',
  });
  return { status: res.status, ok: res.ok };
}
