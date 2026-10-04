const BASE = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

export class ProdigiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "X-API-Key": key, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) throw new ProdigiError(`Prodigi ${init.method || "GET"} ${path} failed: ${res.status} ${text.slice(0, 500)}`, res.status, body);
  return body as T;
}

export interface ProdigiOrderInput {
  merchantReference: string;
  idempotencyKey: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: {
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
  items: {
    merchantReference?: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, string>;
}

export function createOrder(order: ProdigiOrderInput) {
  return call<{ outcome: string; order: any }>("/orders", { method: "POST", body: JSON.stringify(order) });
}

export function getOrder(id: string) {
  return call<{ outcome: string; order: any }>(`/orders/${encodeURIComponent(id)}`);
}
