// Thin client for the Prodigi Print API order-creation endpoint.
// Docs: https://www.prodigi.com/print-api/docs/reference/

import { STYLES, SHIRT_COLOR, SIZES, ShirtSize, ShirtStyle } from "./shirt";

const PRODIGI_BASE_URL =
  process.env.PRODIGI_API_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0";

export interface ProdigiRecipient {
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
}

export interface CreateProdigiOrderArgs {
  merchantReference: string;
  recipient: ProdigiRecipient;
  style: ShirtStyle;
  size: ShirtSize;
  artworkUrl: string;
}

export interface ProdigiOrderResult {
  ok: boolean;
  orderId?: string;
  status?: string;
  raw: unknown;
}

export async function createProdigiOrder({
  merchantReference,
  recipient,
  style,
  size,
  artworkUrl,
}: CreateProdigiOrderArgs): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new Error("PRODIGI_API_KEY is not set");
  }

  const body = {
    merchantReference,
    idempotencyKey: merchantReference,
    shippingMethod: "Standard",
    recipient,
    items: [
      {
        merchantReference,
        sku: STYLES[style].sku,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: {
          color: SHIRT_COLOR,
          size: SIZES[size],
        },
        assets: [
          {
            printArea: "front",
            url: artworkUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${PRODIGI_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false, raw: json };
  }

  const order = (json as { order?: { id?: string; status?: { stage?: string } } })
    .order;

  return {
    ok: true,
    orderId: order?.id,
    status: order?.status?.stage,
    raw: json,
  };
}
