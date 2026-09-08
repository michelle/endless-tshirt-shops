/** Thin Prodigi Print API v4 client. */

const BASE = process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0";

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
};

export type ProdigiOrderInput = {
  merchantReference: string;
  /** Prodigi dedupes on this, so retried webhooks cannot double-print. */
  idempotencyKey: string;
  shippingMethod: string;
  callbackUrl?: string;
  recipient: {
    name: string;
    email?: string;
    phoneNumber?: string | null;
    address: ProdigiAddress;
  };
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
  merchantReference: string | null;
  status: {
    stage: string;
    issues: { objectId: string | null; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  shipments: {
    id: string;
    carrier?: { name: string; service: string } | null;
    tracking?: { number: string; url: string } | null;
    dispatchDate?: string | null;
  }[];
};

export type ProdigiResult<T> = { outcome: string; order?: T };

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  return key;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Prodigi ${path} returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return body as T;
}

/** Creates an order. Returns outcome "Created" or "AlreadyExists" — the
 *  latter means a prior attempt with the same idempotencyKey already won. */
export function createProdigiOrder(
  input: ProdigiOrderInput
): Promise<ProdigiResult<ProdigiOrder>> {
  return request("/Orders", { method: "POST", body: JSON.stringify(input) });
}

export function getProdigiOrder(id: string): Promise<ProdigiResult<ProdigiOrder>> {
  return request(`/Orders/${encodeURIComponent(id)}`);
}
