import { PRODIGI_SKU, prodigiSize, type ShirtColor, type ShirtSize, type ShirtStyle } from "@/lib/product";

const PRODIGI_BASE_URL = process.env.PRODIGI_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0";

export type ProdigiRecipient = {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
};

export type CreateProdigiOrderInput = {
  merchantReference: string;
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  style: ShirtStyle;
  size: ShirtSize;
  color: ShirtColor;
  artworkUrl: string;
};

export type ProdigiOrder = {
  id: string;
  status: { stage: string; details?: unknown };
  [key: string]: unknown;
};

export class ProdigiError extends Error {
  constructor(message: string, public readonly details: unknown) {
    super(message);
    this.name = "ProdigiError";
  }
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

export async function createProdigiOrder(input: CreateProdigiOrderInput): Promise<ProdigiOrder> {
  const body = {
    merchantReference: input.merchantReference,
    idempotencyKey: input.idempotencyKey,
    shippingMethod: "Standard",
    recipient: input.recipient,
    items: [
      {
        sku: PRODIGI_SKU[input.style],
        copies: 1,
        sizing: "fitPrintArea",
        attributes: {
          size: prodigiSize(input.size),
          color: input.color,
        },
        assets: [
          {
            printArea: "front",
            url: input.artworkUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${PRODIGI_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey(),
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json();

  // "AlreadyExists" is Prodigi's idempotent-replay outcome: same idempotencyKey,
  // same order returned instead of a duplicate being created.
  const OK_OUTCOMES = new Set(["Created", "Ok", "AlreadyExists"]);
  if (!res.ok || !OK_OUTCOMES.has(payload.outcome)) {
    throw new ProdigiError(
      `Prodigi order creation failed (${res.status}): ${payload.outcome ?? "unknown"}`,
      payload
    );
  }

  return payload.order as ProdigiOrder;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder> {
  const res = await fetch(`${PRODIGI_BASE_URL}/orders/${id}`, {
    headers: { "X-API-Key": apiKey() },
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new ProdigiError(`Failed to fetch Prodigi order ${id}`, payload);
  }
  return payload.order as ProdigiOrder;
}
