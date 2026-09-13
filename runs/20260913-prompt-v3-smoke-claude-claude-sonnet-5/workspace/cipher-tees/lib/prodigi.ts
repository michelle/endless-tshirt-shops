// Thin client for the Prodigi Print API (sandbox by default).
// https://www.prodigi.com/print-api/docs/reference/

const PRODIGI_BASE_URL = process.env.PRODIGI_API_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0";

function requireApiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

export interface ProdigiAddress {
  line1: string;
  line2?: string | null;
  townOrCity: string;
  stateOrCounty?: string | null;
  postalOrZipCode: string;
  countryCode: string;
}

export interface ProdigiOrderItemInput {
  sku: string;
  copies: number;
  sizing: "fitPrintArea" | "fillPrintArea" | "stretchToPrintArea";
  attributes: Record<string, string>;
  assetUrl: string;
}

export interface CreateProdigiOrderInput {
  merchantReference: string;
  idempotencyKey: string;
  recipientName: string;
  recipientEmail?: string;
  address: ProdigiAddress;
  items: ProdigiOrderItemInput[];
}

export async function createProdigiOrder(input: CreateProdigiOrderInput) {
  const res = await fetch(`${PRODIGI_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": requireApiKey(),
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      merchantReference: input.merchantReference,
      idempotencyKey: input.idempotencyKey,
      shippingMethod: "Standard",
      recipient: {
        name: input.recipientName,
        email: input.recipientEmail,
        address: input.address,
      },
      items: input.items.map((item) => ({
        sku: item.sku,
        copies: item.copies,
        sizing: item.sizing,
        attributes: item.attributes,
        assets: [{ printArea: "front", url: item.assetUrl }],
      })),
    }),
  });

  const json = await res.json();
  if (!res.ok || (json.outcome !== "Created" && json.outcome !== "CreatedWithIssues")) {
    throw new Error(`Prodigi order creation failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.order as { id: string; status: { stage: string } };
}

export async function getProdigiOrder(orderId: string) {
  const res = await fetch(`${PRODIGI_BASE_URL}/orders/${orderId}`, {
    headers: { "X-API-Key": requireApiKey() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.order as {
    id: string;
    status: { stage: string };
    shipments: { carrier: { name: string; service: string }; trackingNumber?: string; trackingUrl?: string }[];
  } | null;
}
