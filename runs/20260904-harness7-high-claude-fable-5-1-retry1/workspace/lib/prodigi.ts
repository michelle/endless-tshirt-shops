/**
 * Minimal Prodigi Print API v4 client. Docs: https://www.prodigi.com/print-api/docs/reference/
 * Uses the sandbox host unless PRODIGI_ENV=live.
 */
import { requireEnv } from "./env";

export function prodigiBaseUrl(): string {
  return process.env.PRODIGI_ENV === "live"
    ? "https://api.prodigi.com/v4.0"
    : "https://api.sandbox.prodigi.com/v4.0";
}

export function prodigiIsSandbox(): boolean {
  return process.env.PRODIGI_ENV !== "live";
}

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: ProdigiAddress;
}

export interface ProdigiOrderItem {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes?: Record<string, string>;
  recipientCost?: { amount: string; currency: string };
  assets: { printArea: string; url: string; md5Hash?: string }[];
}

export interface ProdigiCreateOrderRequest {
  merchantReference?: string;
  shippingMethod: "Budget" | "Standard" | "StandardPlus" | "Express" | "Overnight";
  idempotencyKey?: string;
  callbackUrl?: string;
  recipient: ProdigiRecipient;
  items: ProdigiOrderItem[];
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  lastUpdated?: string;
  merchantReference?: string;
  shippingMethod?: string;
  status: {
    stage: "InProgress" | "Complete" | "Cancelled" | string;
    issues: { objectId?: string | null; errorCode: string; description: string; authorisationDetails?: unknown }[];
    details: Record<string, string>;
  };
  charges?: unknown[];
  shipments?: {
    id: string;
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string };
    dispatchDate?: string;
    items?: { itemId: string }[];
    fulfillmentLocation?: { countryCode?: string; labCode?: string };
  }[];
  recipient?: ProdigiRecipient;
  items?: (ProdigiOrderItem & { id: string; status?: string })[];
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrderResponse {
  outcome: "Created" | "CreatedWithIssues" | "OnHold" | "AlreadyExists" | string;
  order: ProdigiOrder;
  traceParent?: string;
}

export class ProdigiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "ProdigiError";
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${prodigiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "X-API-Key": requireEnv("PRODIGI_API_KEY"),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
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
    throw new ProdigiError(`Prodigi ${init.method ?? "GET"} ${path} failed with ${res.status}`, res.status, body);
  }
  return body as T;
}

export function createOrder(req: ProdigiCreateOrderRequest): Promise<ProdigiOrderResponse> {
  return call<ProdigiOrderResponse>("/orders", { method: "POST", body: JSON.stringify(req) });
}

export function getOrder(id: string): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call(`/orders/${encodeURIComponent(id)}`);
}

export interface ProdigiQuoteRequest {
  shippingMethod?: string;
  destinationCountryCode: string;
  currencyCode?: string;
  items: { sku: string; copies: number; attributes?: Record<string, string>; assets: { printArea: string }[] }[];
}

export function getQuote(req: ProdigiQuoteRequest): Promise<{ outcome: string; issues?: unknown[]; quotes: unknown[] }> {
  return call("/quotes", { method: "POST", body: JSON.stringify(req) });
}

export function getProduct(sku: string): Promise<{ outcome: string; product: unknown }> {
  return call(`/products/${encodeURIComponent(sku)}`);
}
