// Minimal client for the Prodigi Print API (v4.0), used to fulfill orders
// by printing and shipping the current-datetime t-shirt.
//
// Docs: https://www.prodigi.com/print-api/docs/reference/

const PRODIGI_API_BASE =
  process.env.PRODIGI_API_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0";

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

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
  email?: string;
  address: ProdigiAddress;
}

export interface ProdigiItem {
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
}

export interface CreateProdigiOrderInput {
  merchantReference: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  shippingMethod?: "Budget" | "Standard" | "Express" | "Overnight";
  callbackUrl?: string;
}

export interface ProdigiOrder {
  id: string;
  status: { stage: string; issues: unknown[] };
  shipments: unknown[];
  [key: string]: unknown;
}

async function prodigiFetch(path: string, init: RequestInit) {
  const res = await fetch(`${PRODIGI_API_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || (body && body.outcome && !["Ok", "Created"].includes(body.outcome))) {
    throw new ProdigiError(
      `Prodigi API error (${res.status}): ${JSON.stringify(body)}`,
      body
    );
  }
  return body;
}

export class ProdigiError extends Error {
  body: unknown;
  constructor(message: string, body: unknown) {
    super(message);
    this.name = "ProdigiError";
    this.body = body;
  }
}

export async function createProdigiOrder(
  input: CreateProdigiOrderInput
): Promise<ProdigiOrder> {
  const body = await prodigiFetch("/Orders", {
    method: "POST",
    body: JSON.stringify({
      merchantReference: input.merchantReference,
      shippingMethod: input.shippingMethod ?? "Standard",
      callbackUrl: input.callbackUrl,
      recipient: input.recipient,
      items: input.items,
    }),
  });
  return body.order as ProdigiOrder;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder> {
  const body = await prodigiFetch(`/Orders/${id}`, { method: "GET" });
  return body.order as ProdigiOrder;
}
