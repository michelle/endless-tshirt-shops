/**
 * Prodigi Print API v4.0 — the bit that turns a paid Stripe intent into a
 * physical shirt in an envelope.
 */

const BASE =
  process.env.PRODIGI_API_BASE ||
  (process.env.PRODIGI_API_KEY?.startsWith("test_")
    ? "https://api.sandbox.prodigi.com/v4.0"
    : "https://api.prodigi.com/v4.0");

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
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  items: Array<{
    merchantReference: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: Array<{ printArea: string; url: string }>;
  }>;
};

export type ProdigiOrderResponse = {
  outcome: string;
  order?: {
    id: string;
    status?: { stage?: string; details?: unknown };
    [k: string]: unknown;
  };
  traceParent?: string;
  [k: string]: unknown;
};

function key() {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error("PRODIGI_API_KEY is not set");
  return k;
}

async function call<T>(method: string, path: string, body?: unknown, idempotencyKey?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "X-API-Key": key(),
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { outcome: "InvalidResponse", raw: text.slice(0, 500) };
  }

  if (!res.ok) {
    const err = new Error(`Prodigi ${method} ${path} -> ${res.status}: ${text.slice(0, 800)}`);
    (err as Error & { status?: number; body?: unknown }).status = res.status;
    (err as Error & { status?: number; body?: unknown }).body = json;
    throw err;
  }
  return json as T;
}

export function createOrder(order: ProdigiOrderRequest) {
  return call<ProdigiOrderResponse>("POST", "/Orders", order, order.idempotencyKey);
}

export function getOrder(id: string) {
  return call<ProdigiOrderResponse>("GET", `/Orders/${encodeURIComponent(id)}`);
}

export function isSandbox() {
  return BASE.includes("sandbox");
}

export { BASE as PRODIGI_BASE };
