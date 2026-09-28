import "server-only";

// Minimal Prodigi Print API v4 client. Defaults to the sandbox; set PRODIGI_API_BASE for live.
const BASE = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

export type ProdigiAddress = {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string;
};

export type ProdigiOrderRequest = {
  merchantReference: string;
  idempotencyKey: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  callbackUrl?: string;
  recipient: { name: string; email?: string; phoneNumber?: string; address: ProdigiAddress };
  items: {
    merchantReference: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, string>;
};

export type ProdigiOrder = {
  id: string;
  created?: string;
  status?: {
    stage: string;
    issues?: { errorCode: string; description: string }[];
    details?: Record<string, string>;
  };
  shipments?: { id: string; status: string; carrier?: { name: string; service: string }; tracking?: { number?: string; url?: string } }[];
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  const res = await fetch(`${BASE}${path}`, {
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
    throw new Error(`Prodigi ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`Prodigi ${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  return json as T;
}

/**
 * Creates an order. Prodigi de-duplicates on idempotencyKey and answers "AlreadyExists"
 * with the original order id, so retries (webhook redelivery, fallback path) are safe.
 */
export async function createOrder(req: ProdigiOrderRequest): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call("POST", "/orders", req);
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  const res = await call<{ outcome: string; order?: ProdigiOrder }>("GET", `/orders/${encodeURIComponent(id)}`);
  return res.order ?? null;
}
