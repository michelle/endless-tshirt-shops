import { PRODUCT_SKU } from "./config";

const PRODIGI_BASE = "https://api.sandbox.prodigi.com/v4.0";

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  countryCode: string;
  email?: string;
}

export interface ProdigiOrderInput {
  merchantReference: string;
  idempotencyKey: string;
  recipient: ShippingAddress;
  sku: string;
  copies: number;
  color: string;
  size: string;
  assetUrl: string;
  recipientCostUsd: number;
}

export async function createProdigiOrder(input: ProdigiOrderInput) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not set");

  const body = {
    merchantReference: input.merchantReference,
    idempotencyKey: input.idempotencyKey,
    shippingMethod: "Standard",
    recipient: {
      name: input.recipient.name,
      email: input.recipient.email || null,
      address: {
        line1: input.recipient.line1,
        line2: input.recipient.line2 || null,
        postalOrZipCode: input.recipient.postalCode,
        countryCode: input.recipient.countryCode,
        townOrCity: input.recipient.city,
        stateOrCounty: input.recipient.state || null,
      },
    },
    items: [
      {
        merchantReference: input.merchantReference,
        sku: input.sku || PRODUCT_SKU,
        copies: input.copies,
        sizing: "fillPrintArea",
        attributes: {
          color: input.color,
          size: input.size,
        },
        recipientCost: {
          amount: String(input.recipientCostUsd),
          currency: "USD",
        },
        assets: [
          {
            printArea: "front",
            url: input.assetUrl,
          },
        ],
      },
    ],
    metadata: {
      source: "stellara",
    },
  };

  const res = await fetch(`${PRODIGI_BASE}/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Prodigi order failed (${res.status}): ${text.slice(0, 500)}`);
  }

  return json;
}
