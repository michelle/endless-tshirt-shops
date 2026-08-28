// Minimal client for the Prodigi Print API (sandbox), used to fulfill the
// single product this store sells: a t-shirt printed with the exact
// millisecond timestamp captured at checkout.
//
// Docs: https://www.prodigi.com/print-api/docs/reference/

import { PRODIGI_COLOR, PRODIGI_SKU, ShirtSize, ShirtStyle, prodigiSize } from "./shirt";

const BASE_URL = process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) {
    throw new Error(
      "PRODIGI_API_KEY is not set. Add it to your environment (see README).",
    );
  }
  return key;
}

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  townOrCity: string;
  stateOrCounty?: string | null;
  postalOrZipCode: string;
  countryCode: string;
};

export type ProdigiOrderInput = {
  merchantReference: string;
  recipientName: string;
  recipientEmail: string;
  address: ProdigiAddress;
  style: ShirtStyle;
  size: ShirtSize;
  artworkUrl: string;
};

export type ProdigiOrder = {
  id: string;
  status: { stage: string; issues?: unknown[] };
  [key: string]: unknown;
};

async function prodigiFetch(path: string, init: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Prodigi ${init.method ?? "GET"} ${path} failed (${res.status}): ${JSON.stringify(body)}`,
    );
  }
  return body;
}

export async function createProdigiOrder(
  input: ProdigiOrderInput,
): Promise<ProdigiOrder> {
  const body = {
    merchantReference: input.merchantReference,
    // Prodigi dedupes order-creation requests on this key (scoped to our
    // account), so even a retried/duplicate webhook delivery that races
    // past our own PaymentIntent-metadata check can't create two orders
    // for the same Stripe Checkout Session.
    idempotencyKey: input.merchantReference,
    shippingMethod: "Standard",
    recipient: {
      name: input.recipientName,
      email: input.recipientEmail,
      address: {
        line1: input.address.line1,
        line2: input.address.line2 || undefined,
        townOrCity: input.address.townOrCity,
        stateOrCounty: input.address.stateOrCounty || undefined,
        postalOrZipCode: input.address.postalOrZipCode,
        countryCode: input.address.countryCode,
      },
    },
    items: [
      {
        sku: PRODIGI_SKU[input.style],
        copies: 1,
        sizing: "fillPrintArea",
        attributes: {
          color: PRODIGI_COLOR,
          size: prodigiSize(input.size),
        },
        assets: [{ printArea: "front", url: input.artworkUrl }],
      },
    ],
  };

  const json = await prodigiFetch("/Orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json.order as ProdigiOrder;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder> {
  const json = await prodigiFetch(`/Orders/${id}`, { method: "GET" });
  return json.order as ProdigiOrder;
}
