// Thin wrapper around the Prodigi Print API v4.
//
// Uses the sandbox environment: https://api.sandbox.prodigi.com/v4.0
// In production, switch PRODIGI_BASE_URL to https://api.prodigi.com/v4.0
// and replace the key with a live credential.

import {
  Customization,
  PRODIGI_SKU,
  ShirtColor,
  type ShirtSize,
} from "./render";

export interface Recipient {
  name: string;
  email?: string;
  phone?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

export interface CreateOrderInput {
  customization: Customization;
  recipient: Recipient;
  shippingMethod?: "Standard" | "Budget" | "StandardPlus" | "Express" | "Overnight";
  merchantReference: string;
  idempotencyKey: string;
  assetUrl: string;
  callbackUrl?: string;
}

function baseUrl(): string {
  return process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  return key;
}

async function prodigiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Surface the validation failure so the reason is visible to the user.
    const detail = typeof body === "object" && body && "outcome" in body
      ? JSON.stringify(body)
      : JSON.stringify(body).slice(0, 400);
    throw new ProdigiError(`Prodigi ${res.status} ${path}: ${detail}`, res.status, body);
  }
  return body as T;
}

export class ProdigiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

const COLOR_TO_PRODIGI: Record<ShirtColor, string> = {
  navy: "navy blue",
  black: "black",
  forest: "military green",
  charcoal: "asphalt",
  white: "white",
};

export async function createProdigiOrder(input: CreateOrderInput) {
  const c = input.customization;
  const payload = {
    merchantReference: input.merchantReference,
    idempotencyKey: input.idempotencyKey,
    shippingMethod: input.shippingMethod || "Standard",
    callbackUrl: input.callbackUrl,
    recipient: {
      name: input.recipient.name,
      email: input.recipient.email,
      phoneNumber: input.recipient.phone,
      address: {
        line1: input.recipient.address.line1,
        line2: input.recipient.address.line2,
        postalOrZipCode: input.recipient.address.postalCode,
        countryCode: input.recipient.address.country,
        townOrCity: input.recipient.address.city,
        stateOrCounty: input.recipient.address.state,
      },
    },
    items: [
      {
        sku: PRODIGI_SKU,
        copies: 1,
        merchantReference: `${input.merchantReference}-tee`,
        sizing: "fillPrintArea",
        attributes: {
          color: COLOR_TO_PRODIGI[c.color],
          size: c.size,
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
      source: "gnomon-tees",
      gnomonReference: input.merchantReference,
      inscription: `${c.phrase}|${c.phrase2}|${c.place}|${c.date}`,
    },
  };

  return prodigiFetch<{ outcome: string; order: { id: string; status: { stage: string } } }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getProdigiOrder(orderId: string) {
  return prodigiFetch<{ outcome: string; order: { id: string; status: { stage: string; details: Record<string, string> } } }>(
    `/orders/${encodeURIComponent(orderId)}`,
  );
}
