// Server-only helper for the Prodigi Print API (sandbox).
// Docs: https://www.prodigi.com/print-api/docs/reference/

import { PRODIGI_SKU, SHIRT_COLORS } from "./designs";
import type { CartItem } from "./cart";

const PRODIGI_BASE_URL = "https://api.sandbox.prodigi.com/v4.0";

export type ShippingMethod = "Budget" | "Standard" | "Express";

export type CheckoutRecipient = {
  name: string;
  email: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    townOrCity: string;
    stateOrCounty?: string;
    postalOrZipCode: string;
    countryCode: string;
  };
};

export type ProdigiOrderResult = {
  outcome: string;
  order?: {
    id: string;
    status?: { stage?: string };
    charges?: unknown[];
    costSummary?: unknown;
  };
  raw: unknown;
};

function colorAttribute(colorKey: CartItem["color"]) {
  return SHIRT_COLORS.find((c) => c.key === colorKey)?.prodigiAttribute ?? colorKey;
}

export function buildProdigiOrderPayload({
  items,
  recipient,
  shippingMethod,
  merchantReference,
  assetBaseUrl,
}: {
  items: CartItem[];
  recipient: CheckoutRecipient;
  shippingMethod: ShippingMethod;
  merchantReference: string;
  assetBaseUrl: string;
}) {
  return {
    merchantReference,
    shippingMethod,
    recipient,
    items: items.map((item) => ({
      sku: PRODIGI_SKU,
      copies: item.qty,
      sizing: "fitPrintArea",
      attributes: {
        color: colorAttribute(item.color),
        size: item.size,
      },
      assets: [
        {
          printArea: "front",
          url: `${assetBaseUrl}/art/${item.slug}-print.png`,
        },
      ],
    })),
  };
}

export async function createProdigiOrder(payload: ReturnType<typeof buildProdigiOrderPayload>) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new Error("PRODIGI_API_KEY is not configured on the server.");
  }

  const res = await fetch(`${PRODIGI_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    const message =
      json?.outcome ?? json?.error?.message ?? `Prodigi request failed (${res.status})`;
    throw new ProdigiError(message, json);
  }

  return {
    outcome: json.outcome,
    order: json.order,
    raw: json,
  } satisfies ProdigiOrderResult;
}

export class ProdigiError extends Error {
  details: unknown;
  constructor(message: string, details: unknown) {
    super(message);
    this.name = "ProdigiError";
    this.details = details;
  }
}
