// Minimal Prodigi Print API v4 client.
// Docs: https://www.prodigi.com/print-api/docs/reference/

const API_URL = (process.env.PRODIGI_API_URL ?? "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");

function apiKey(): string {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error("PRODIGI_API_KEY is not configured");
  return k;
}

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
  recipient: { name: string; email?: string; phoneNumber?: string; address: ProdigiAddress };
  items: Array<{
    merchantReference: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: Array<{ printArea: string; url: string }>;
  }>;
  metadata?: Record<string, string>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  merchantReference?: string;
  status: {
    stage: string;
    issues?: Array<{ objectId?: string; errorCode: string; description: string }>;
    details?: Record<string, string>;
  };
  shipments?: Array<{ carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string }>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T & { outcome: string }> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${init.method ?? "GET"} ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return body as T & { outcome: string };
}

export async function createProdigiOrder(order: ProdigiOrderRequest): Promise<{ outcome: string; order: ProdigiOrder }> {
  const res = await request<{ order: ProdigiOrder }>("/orders", { method: "POST", body: JSON.stringify(order) });
  if (!res.order?.id) throw new Error(`Prodigi order not created: ${JSON.stringify(res).slice(0, 500)}`);
  return res;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder> {
  const res = await request<{ order: ProdigiOrder }>(`/orders/${encodeURIComponent(id)}`);
  return res.order;
}

export function isSandbox(): boolean {
  return API_URL.includes("sandbox");
}
