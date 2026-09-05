/**
 * Minimal typed client for the Prodigi Print API v4.
 * Docs: https://www.prodigi.com/print-api/docs/reference/
 */

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

export interface ProdigiItemInput {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes?: Record<string, string>;
  assets: { printArea: string; url: string; md5Hash?: string }[];
}

export interface ProdigiOrderInput {
  merchantReference?: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey?: string;
  recipient: ProdigiRecipient;
  items: ProdigiItemInput[];
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  status: {
    stage: string;
    issues: { objectId: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  merchantReference?: string;
  shippingMethod: string;
  recipient: ProdigiRecipient;
  items: (ProdigiItemInput & { id: string; status: string })[];
  shipments: { id: string; carrier?: { name: string; service: string }; tracking?: { number: string; url: string }; status: string }[];
}

export interface ProdigiOrderResponse {
  outcome: "Created" | "CreatedWithIssues" | "AlreadyExists" | "OnHold" | string;
  order: ProdigiOrder;
  traceParent?: string;
}

export class ProdigiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ProdigiError";
  }
}

function apiBase(): string {
  return (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");
}

export function prodigiIsSandbox(): boolean {
  return apiBase().includes("sandbox");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  if (!res.ok) {
    const outcome = (body as { outcome?: string } | null)?.outcome;
    throw new ProdigiError(`Prodigi ${init.method || "GET"} ${path} failed: ${res.status} ${outcome || ""}`.trim(), res.status, body);
  }
  return body as T;
}

export function createOrder(input: ProdigiOrderInput): Promise<ProdigiOrderResponse> {
  return request<ProdigiOrderResponse>("/orders", { method: "POST", body: JSON.stringify(input) });
}

export function getOrder(id: string): Promise<ProdigiOrderResponse> {
  return request<ProdigiOrderResponse>(`/orders/${encodeURIComponent(id)}`);
}

export interface ProdigiQuoteResponse {
  outcome: string;
  issues?: { errorCode: string; description: string }[];
  quotes: {
    shipmentMethod: string;
    costSummary: { items: { amount: string; currency: string }; shipping: { amount: string; currency: string }; totalCost: { amount: string; currency: string } };
  }[];
}

export function getQuote(input: {
  shippingMethod: ProdigiOrderInput["shippingMethod"];
  destinationCountryCode: string;
  currencyCode: string;
  items: { sku: string; copies: number; attributes?: Record<string, string>; assets: { printArea: string }[] }[];
}): Promise<ProdigiQuoteResponse> {
  return request<ProdigiQuoteResponse>("/quotes", { method: "POST", body: JSON.stringify(input) });
}
