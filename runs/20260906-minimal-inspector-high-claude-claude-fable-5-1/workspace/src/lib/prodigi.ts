/**
 * Minimal client for the Prodigi Print API v4.
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

export interface ProdigiItem {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes?: Record<string, string>;
  assets: { printArea: string; url: string }[];
}

export interface ProdigiCreateOrderRequest {
  merchantReference?: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey?: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, string>;
}

export interface ProdigiOrder {
  id: string;
  created?: string;
  status?: {
    stage: string;
    issues?: { errorCode?: string; description?: string }[];
    details?: Record<string, string>;
  };
  shipments?: unknown[];
  [key: string]: unknown;
}

export interface ProdigiOrderResponse {
  outcome: string;
  order?: ProdigiOrder;
  issues?: unknown[];
  failures?: unknown;
  traceParent?: string;
  [key: string]: unknown;
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

function config() {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not set");
  const baseUrl = (process.env.PRODIGI_API_URL || "https://api.sandbox.prodigi.com/v4.0").replace(/\/+$/, "");
  return { apiKey, baseUrl };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey, baseUrl } = config();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
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

/**
 * Create an order. Prodigi honours `idempotencyKey`: a repeat call with the
 * same key returns outcome "AlreadyExists" and the id of the original order,
 * which is what lets the webhook and the client-side poll race safely.
 */
export async function createOrder(order: ProdigiCreateOrderRequest): Promise<ProdigiOrderResponse> {
  const body = await request<ProdigiOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
  const ok = ["Created", "CreatedWithIssues", "AlreadyExists", "OnHold"];
  if (!ok.includes(body.outcome) || !body.order?.id) {
    throw new ProdigiError(`Prodigi order not created: ${body.outcome}`, 200, body);
  }
  return body;
}

export async function getOrder(id: string): Promise<ProdigiOrderResponse> {
  return request<ProdigiOrderResponse>(`/orders/${encodeURIComponent(id)}`);
}
