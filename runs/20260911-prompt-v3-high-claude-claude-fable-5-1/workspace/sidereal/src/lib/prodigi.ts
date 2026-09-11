// Thin client for the Prodigi Print API v4.
// Docs: https://www.prodigi.com/print-api/docs/reference/

const BASE = (process.env.PRODIGI_API_URL ?? "https://api.sandbox.prodigi.com").replace(/\/$/, "");

function headers(): Record<string, string> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return { "X-API-Key": key, "Content-Type": "application/json" };
}

export type ProdigiShippingMethod = "Budget" | "Standard" | "Express" | "Overnight";

export interface ProdigiRecipient {
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
}

export interface ProdigiOrderRequest {
  merchantReference: string;
  shippingMethod: ProdigiShippingMethod;
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  items: {
    merchantReference: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, string>;
  callbackUrl?: string;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  status: {
    stage: string; // InProgress | Complete | Cancelled ...
    issues: { objectId: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  shipments?: { id: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string }[];
}

export interface ProdigiCreateResponse {
  outcome: string; // Created | CreatedWithIssues | AlreadyExists | ...
  order: ProdigiOrder;
  traceParent?: string;
}

export async function createProdigiOrder(req: ProdigiOrderRequest): Promise<ProdigiCreateResponse> {
  const res = await fetch(`${BASE}/v4.0/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(req),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Prodigi ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text) as ProdigiCreateResponse;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  const res = await fetch(`${BASE}/v4.0/orders/${encodeURIComponent(id)}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`Prodigi ${res.status}: ${text.slice(0, 500)}`);
  return (JSON.parse(text) as { order: ProdigiOrder }).order;
}

export function isSandbox(): boolean {
  return BASE.includes("sandbox");
}
