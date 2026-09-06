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
  status: {
    stage: string; // InProgress | Complete | Cancelled ...
    issues: { objectId: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  merchantReference?: string;
  shipments?: { id: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string }[];
  items?: { id: string; status: string; sku: string; copies: number }[];
}

export interface ProdigiOrderResponse {
  outcome: "Created" | "CreatedWithIssues" | "OnHold" | "AlreadyExists" | string;
  order: ProdigiOrder;
  traceParent?: string;
}

function baseUrl(): string {
  return (process.env.PRODIGI_API_URL ?? "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${method} ${path} failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return json as T;
}

export function createProdigiOrder(req: ProdigiOrderRequest): Promise<ProdigiOrderResponse> {
  return call<ProdigiOrderResponse>("POST", "/Orders", req);
}

export function getProdigiOrder(id: string): Promise<ProdigiOrderResponse> {
  return call<ProdigiOrderResponse>("GET", `/Orders/${encodeURIComponent(id)}`);
}

export function isSandbox(): boolean {
  return baseUrl().includes("sandbox");
}
