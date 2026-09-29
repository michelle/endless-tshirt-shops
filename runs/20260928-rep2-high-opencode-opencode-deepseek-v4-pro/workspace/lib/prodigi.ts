// Minimal Prodigi Print API client (v4.0).

const PRODIGI_BASE = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

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
  address: ProdigiAddress;
}

export interface ProdigiOrderInput {
  merchantReference: string;
  idempotencyKey: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: ProdigiRecipient;
  sku: string;
  color: string;
  size: string;
  assetUrl: string;
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrderResult {
  id: string;
  status: string;
  [key: string]: unknown;
}

export async function createProdigiOrder(input: ProdigiOrderInput): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");

  const body = {
    merchantReference: input.merchantReference,
    idempotencyKey: input.idempotencyKey,
    shippingMethod: input.shippingMethod,
    recipient: {
      name: input.recipient.name,
      email: input.recipient.email ?? null,
      address: {
        line1: input.recipient.address.line1,
        line2: input.recipient.address.line2 ?? null,
        postalOrZipCode: input.recipient.address.postalOrZipCode,
        countryCode: input.recipient.address.countryCode,
        townOrCity: input.recipient.address.townOrCity,
        stateOrCounty: input.recipient.address.stateOrCounty ?? null,
      },
    },
    items: [
      {
        merchantReference: input.merchantReference,
        sku: input.sku,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: {
          color: input.color,
          size: input.size,
        },
        assets: [
          {
            printArea: "front",
            url: input.assetUrl,
          },
        ],
      },
    ],
    metadata: input.metadata ?? {},
  };

  const res = await fetch(`${PRODIGI_BASE}/Orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Prodigi order creation failed (${res.status}): ${JSON.stringify(data)}`
    );
  }

  const order = data.order ?? data;
  return order as ProdigiOrderResult;
}
