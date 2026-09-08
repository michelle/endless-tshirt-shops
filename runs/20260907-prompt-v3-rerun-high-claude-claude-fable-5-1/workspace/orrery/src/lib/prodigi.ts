import "server-only";

const BASE = (process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com").replace(/\/$/, "");

export interface ProdigiAddress {
  line1: string; line2?: string; postalOrZipCode: string; countryCode: string; townOrCity: string; stateOrCounty?: string;
}
export interface ProdigiOrderRequest {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey: string;
  recipient: { name: string; email?: string; phoneNumber?: string; address: ProdigiAddress };
  items: Array<{
    merchantReference?: string; sku: string; copies: number;
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
    stage: "InProgress" | "Complete" | "Cancelled" | string;
    issues?: Array<{ objectId?: string; errorCode?: string; description?: string }>;
    details?: Record<string, string>;
  };
  shipments?: Array<{ id: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string; status?: string }>;
  recipient?: { name?: string; address?: ProdigiAddress };
}

class ProdigiError extends Error {
  constructor(msg: string, public status: number, public body: unknown) { super(msg); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(`${BASE}/v4.0${path}`, {
    method,
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) throw new ProdigiError(`Prodigi ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`, res.status, json);
  return json as T;
}

export async function createProdigiOrder(req: ProdigiOrderRequest): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call("POST", "/orders", req);
}
export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const r = await call<{ outcome: string; order: ProdigiOrder }>("GET", `/orders/${encodeURIComponent(id)}`);
    return r.order ?? null;
  } catch (e) {
    if (e instanceof ProdigiError && e.status === 404) return null;
    throw e;
  }
}
export async function findProdigiOrderByReference(ref: string): Promise<ProdigiOrder | null> {
  const r = await call<{ outcome: string; orders?: ProdigiOrder[] }>("GET", `/orders?top=5&merchantReferences=${encodeURIComponent(ref)}`);
  return (r.orders ?? []).find((o) => o.merchantReference === ref) ?? null;
}
