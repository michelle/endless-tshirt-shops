/** Minimal Prodigi Print API v4 client. Docs: https://www.prodigi.com/print-api/docs/reference/ */

const base = () => (process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");

function headers() {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return { "X-API-Key": key, "Content-Type": "application/json" };
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
  status: {
    stage: string;
    issues: Array<{ objectId?: string; errorCode: string; description: string }>;
    details: Record<string, string>;
  };
  shipments: Array<{ id: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; status?: string }>;
  recipient: { name: string; address: ProdigiAddress };
  items: Array<{ id: string; sku: string; copies: number; status: string; attributes: Record<string, string> }>;
}

export interface ProdigiOrderResponse {
  outcome: string;
  order?: ProdigiOrder;
  traceParent?: string;
  [k: string]: unknown;
}

export async function createProdigiOrder(body: ProdigiOrderRequest): Promise<ProdigiOrderResponse> {
  const res = await fetch(`${base()}/orders`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as ProdigiOrderResponse;
  if (!res.ok) {
    throw new Error(`Prodigi order create failed (${res.status}): ${JSON.stringify(json).slice(0, 800)}`);
  }
  return json;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  const res = await fetch(`${base()}/orders/${encodeURIComponent(id)}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Prodigi order fetch failed (${res.status})`);
  const json = (await res.json()) as ProdigiOrderResponse;
  return json.order ?? null;
}
