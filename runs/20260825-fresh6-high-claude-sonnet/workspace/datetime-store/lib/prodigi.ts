const PRODIGI_API_URL =
  process.env.PRODIGI_API_URL ?? "https://api.sandbox.prodigi.com/v4.0";

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
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

export interface CreateOrderParams {
  merchantReference: string;
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  sku: string;
  color: string;
  size: string;
  artworkUrl: string;
}

export interface ProdigiOrderResult {
  outcome: string;
  orderId: string | null;
  status: string | null;
  raw: unknown;
}

export async function createProdigiOrder(
  params: CreateOrderParams
): Promise<ProdigiOrderResult> {
  const body = {
    merchantReference: params.merchantReference,
    idempotencyKey: params.idempotencyKey,
    shippingMethod: "Standard",
    recipient: params.recipient,
    items: [
      {
        sku: params.sku,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: {
          color: params.color,
          size: params.size,
        },
        assets: [
          {
            printArea: "front",
            url: params.artworkUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${PRODIGI_API_URL}/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  const orderId = json?.order?.id ?? null;
  const status = json?.order?.status?.stage ?? null;

  return {
    outcome: json?.outcome ?? "Unknown",
    orderId,
    status,
    raw: json,
  };
}

export async function getProdigiOrder(orderId: string) {
  const res = await fetch(`${PRODIGI_API_URL}/orders/${orderId}`, {
    headers: { "X-API-Key": apiKey() },
  });
  return res.json();
}
