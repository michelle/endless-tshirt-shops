import { createHash } from "crypto";
import { SKU } from "./catalog";
import type { Design } from "./design";

const SANDBOX_BASE = "https://api.sandbox.prodigi.com/v4.0";
const LIVE_BASE = "https://api.prodigi.com/v4.0";

function baseUrl(): string {
  return process.env.PRODIGI_ENV === "live" ? LIVE_BASE : SANDBOX_BASE;
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    townOrCity: string;
    stateOrCounty?: string;
    postalOrZipCode: string;
    countryCode: string;
  };
}

export interface CreateOrderInput {
  /** Stripe checkout session id — used for merchant reference + idempotency. */
  reference: string;
  design: Design;
  recipient: ProdigiRecipient;
  /** Public URL where Prodigi can download the print file. */
  printUrl: string;
  printMd5: string;
  callbackUrl?: string;
}

export async function createProdigiOrder(input: CreateOrderInput) {
  const body: Record<string, unknown> = {
    shippingMethod: "Standard",
    recipient: input.recipient,
    items: [
      {
        merchantReference: "item-1",
        sku: SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: { color: input.design.color, size: input.design.size },
        assets: [
          { printArea: "front", url: input.printUrl, md5Hash: input.printMd5 },
        ],
      },
    ],
    merchantReference: input.reference,
    idempotencyKey: input.reference,
  };
  if (input.callbackUrl) body.callbackUrl = input.callbackUrl;

  const res = await fetch(`${baseUrl()}/orders`, {
    method: "POST",
    headers: { "X-API-Key": apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Prodigi create order failed ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as { outcome: string; order?: { id: string } };
}

export async function getProdigiOrder(orderId: string) {
  const res = await fetch(`${baseUrl()}/orders/${encodeURIComponent(orderId)}`, {
    headers: { "X-API-Key": apiKey() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { outcome?: string; order?: ProdigiOrder };
}

export interface ProdigiOrder {
  id: string;
  status: { stage: string; issues: { objectId?: string; errorCode?: string; detail?: string }[] };
  shipments?: {
    id: string;
    status?: string;
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string };
    dispatchDate?: string;
  }[];
  items?: { id?: string; status?: string; thumbnailUrl?: string | null }[];
  charges?: { totalCost?: { amount: string; currency: string } }[];
}

export function md5Hex(buf: Buffer): string {
  return createHash("md5").update(buf).digest("hex");
}
