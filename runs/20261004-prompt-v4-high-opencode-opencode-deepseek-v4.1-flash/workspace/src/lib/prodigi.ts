import "server-only";

/** Minimal Prodigi Print API v4 client. Docs: https://www.prodigi.com/print-api/docs/reference/ */

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string;
}

export interface ProdigiOrderRequest {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey?: string;
  recipient: {
    name: string;
    email?: string;
    phoneNumber?: string;
    address: ProdigiAddress;
  };
  items: {
    merchantReference?: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes?: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, string>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  merchantReference?: string;
  status: {
    stage: string;
    issues: { objectId: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  shipments?: {
    id: string;
    carrier?: { name?: string; service?: string };
    tracking?: { number?: string; url?: string };
    dispatchDate?: string;
  }[];
  items?: { id: string; status: string; sku: string; copies: number }[];
}

export interface ProdigiOrderResponse {
  outcome: string;
  order: ProdigiOrder;
  traceParent?: string;
}

export class ProdigiApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ProdigiApiError";
  }
}

function baseUrl(): string {
  return (process.env.PRODIGI_API_URL ?? "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new ProdigiApiError(
      `Prodigi ${method} ${path} failed (${response.status}): ${text.slice(0, 600)}`,
      response.status,
      response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500,
    );
  }
  return json as T;
}

export function createProdigiOrder(request: ProdigiOrderRequest): Promise<ProdigiOrderResponse> {
  return call<ProdigiOrderResponse>("POST", "/Orders", request);
}

export function getProdigiOrder(id: string): Promise<ProdigiOrderResponse> {
  return call<ProdigiOrderResponse>("GET", `/Orders/${encodeURIComponent(id)}`);
}

export function isSandbox(): boolean {
  return baseUrl().includes("sandbox");
}
