/** Minimal Prodigi Print API v4 client. Docs: https://www.prodigi.com/print-api/docs/reference/ */

const BASE = (process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com").replace(/\/$/, "");

function headers(): Record<string, string> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return { "X-API-Key": key, "Content-Type": "application/json" };
}

export type ProdigiRecipient = {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
};

export type ProdigiOrderRequest = {
  merchantReference: string;
  idempotencyKey?: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: ProdigiRecipient;
  items: {
    merchantReference?: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, unknown>;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  lastUpdated: string;
  merchantReference?: string;
  shippingMethod: string;
  status: {
    stage: string; // InProgress | Complete | Cancelled
    issues: { objectId: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  recipient: ProdigiRecipient;
  items: { id: string; sku: string; copies: number; status: string; attributes: Record<string, string>; assets: { printArea: string; url: string; status: string }[] }[];
  shipments: { id: string; carrier?: { name: string; service: string }; tracking?: { number: string; url: string }; dispatchDate?: string; status: string }[];
  charges?: unknown[];
};

export type ProdigiCreateResponse = {
  outcome: string; // Created | CreatedWithIssues | AlreadyExists
  order: ProdigiOrder;
  traceParent?: string;
};

export async function createProdigiOrder(req: ProdigiOrderRequest): Promise<ProdigiCreateResponse> {
  const res = await fetch(`${BASE}/v4.0/orders`, { method: "POST", headers: headers(), body: JSON.stringify(req) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Prodigi order failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body as ProdigiCreateResponse;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  const res = await fetch(`${BASE}/v4.0/orders/${encodeURIComponent(id)}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Prodigi GET order failed (${res.status})`);
  const body = (await res.json()) as { order: ProdigiOrder };
  return body.order;
}

export async function findProdigiOrderByReference(merchantReference: string): Promise<ProdigiOrder | null> {
  const q = new URLSearchParams({ top: "1", merchantReferences: merchantReference });
  const res = await fetch(`${BASE}/v4.0/orders?${q}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Prodigi list orders failed (${res.status})`);
  const body = (await res.json()) as { orders: ProdigiOrder[] };
  return body.orders?.[0] ?? null;
}

export async function listProdigiOrders(top = 25): Promise<ProdigiOrder[]> {
  const res = await fetch(`${BASE}/v4.0/orders?top=${top}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Prodigi list orders failed (${res.status})`);
  const body = (await res.json()) as { orders: ProdigiOrder[] };
  return body.orders ?? [];
}

export function prodigiIsSandbox(): boolean {
  return BASE.includes("sandbox");
}
