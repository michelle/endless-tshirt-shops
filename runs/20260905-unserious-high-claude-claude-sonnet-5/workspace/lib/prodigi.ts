// Minimal client for the Prodigi Print API (v4).
// Docs: https://www.prodigi.com/print-api/docs/reference/

const PRODIGI_BASE_URL =
  process.env.PRODIGI_API_URL?.replace(/\/$/, "") ||
  "https://api.sandbox.prodigi.com";

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: ProdigiAddress;
}

export interface CreateOrderInput {
  merchantReference: string;
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  sku: string;
  color: string;
  size: string;
  artworkUrl: string;
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) {
    throw new Error(
      "PRODIGI_API_KEY is not set. Add it to your environment (see .env.example)."
    );
  }
  return key;
}

export async function createProdigiOrder(input: CreateOrderInput) {
  const body = {
    merchantReference: input.merchantReference,
    idempotencyKey: input.idempotencyKey,
    shippingMethod: "Budget",
    recipient: input.recipient,
    items: [
      {
        merchantReference: "shirt",
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
            url: input.artworkUrl,
          },
        ],
      },
    ],
    metadata: {
      source: "datetime.store",
    },
  };

  const res = await fetch(`${PRODIGI_BASE_URL}/v4.0/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      `Prodigi order creation failed (${res.status}): ${JSON.stringify(payload)}`
    );
  }

  // Prodigi returns 200 with outcome "Created" (or "CreatedWithIssues") even
  // though the HTTP call succeeded, so surface issues explicitly.
  if (
    payload?.outcome &&
    payload.outcome !== "Created" &&
    payload.outcome !== "Ok"
  ) {
    console.warn("Prodigi order created with issues:", payload);
  }

  return payload;
}

export async function getProdigiOrder(orderId: string) {
  const res = await fetch(`${PRODIGI_BASE_URL}/v4.0/orders/${orderId}`, {
    headers: { "X-API-Key": apiKey() },
  });
  return res.json();
}
