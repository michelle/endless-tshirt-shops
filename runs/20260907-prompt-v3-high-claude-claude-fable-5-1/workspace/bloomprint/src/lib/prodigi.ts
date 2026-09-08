import "server-only";

/** Minimal Prodigi Print API v4 client. */

const BASE = (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");

function apiKey(): string {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error("PRODIGI_API_KEY is not configured");
  return k;
}

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

export interface ProdigiItem {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
}

export interface ProdigiOrderRequest {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, string>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  status: {
    stage: string;
    issues: { objectId: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  shipments: { id: string; carrier?: { name: string; service: string }; tracking?: { number: string; url: string }; dispatchDate?: string }[];
}

interface ProdigiResponse<T> {
  outcome: string;
  order?: T;
  traceParent?: string;
  issues?: unknown;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<ProdigiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "X-API-Key": apiKey(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: ProdigiResponse<T>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Prodigi ${method} ${path} returned ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${method} ${path} failed (${res.status}): ${text.slice(0, 600)}`);
  }
  return json;
}

export async function createProdigiOrder(req: ProdigiOrderRequest): Promise<ProdigiOrder> {
  const res = await call<ProdigiOrder>("POST", "/orders", req);
  if (!res.order) throw new Error(`Prodigi order not created: ${JSON.stringify(res).slice(0, 600)}`);
  if (res.outcome !== "Created" && res.outcome !== "CreatedWithIssues" && res.outcome !== "AlreadyExists") {
    throw new Error(`Prodigi unexpected outcome ${res.outcome}: ${JSON.stringify(res).slice(0, 600)}`);
  }
  return res.order;
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const res = await call<ProdigiOrder>("GET", `/orders/${encodeURIComponent(id)}`);
    return res.order ?? null;
  } catch {
    return null;
  }
}

export function isSandbox(): boolean {
  return BASE.includes("sandbox");
}
