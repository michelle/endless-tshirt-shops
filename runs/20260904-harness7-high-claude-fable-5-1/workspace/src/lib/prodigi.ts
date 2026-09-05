import { prodigiBaseUrl, requireEnv } from "./env";

/** Minimal typed client for the Prodigi Print API v4.0. */

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: ProdigiAddress;
}

export interface ProdigiItem {
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  merchantReference?: string;
  attributes?: Record<string, string>;
  assets: { printArea: string; url: string; md5Hash?: string }[];
}

export interface ProdigiCreateOrder {
  merchantReference?: string;
  shippingMethod: "Budget" | "Standard" | "StandardPlus" | "Express" | "Overnight";
  idempotencyKey?: string;
  callbackUrl?: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  merchantReference?: string;
  status: {
    stage: "InProgress" | "Complete" | "Cancelled" | string;
    issues: { objectId?: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  shipments?: { id: string; carrier?: { name: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string }[];
  recipient?: ProdigiRecipient;
  items?: unknown[];
}

export interface ProdigiOrderResponse {
  outcome: string;
  order: ProdigiOrder;
  traceParent?: string;
}

export class ProdigiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ProdigiError";
  }
}

async function request<T>(method: string, pathname: string, body?: unknown): Promise<T> {
  const res = await fetch(`${prodigiBaseUrl()}/v4.0${pathname}`, {
    method,
    headers: {
      "X-API-Key": requireEnv("PRODIGI_API_KEY"),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const outcome =
      json && typeof json === "object" && "outcome" in json ? String((json as { outcome: unknown }).outcome) : "";
    throw new ProdigiError(`Prodigi ${method} ${pathname} failed (${res.status} ${outcome})`, res.status, json);
  }
  return json as T;
}

export const prodigi = {
  createOrder: (order: ProdigiCreateOrder) => request<ProdigiOrderResponse>("POST", "/Orders", order),
  getOrder: (id: string) => request<ProdigiOrderResponse>("GET", `/Orders/${encodeURIComponent(id)}`),
  getProduct: (sku: string) => request<{ outcome: string; product: unknown }>("GET", `/products/${encodeURIComponent(sku)}`),
  quote: (body: {
    shippingMethod: string;
    destinationCountryCode: string;
    currencyCode: string;
    items: { sku: string; copies: number; attributes?: Record<string, string>; assets: { printArea: string }[] }[];
  }) => request<{ outcome: string; quotes: { shipmentMethod: string; costSummary: { totalCost: { amount: string; currency: string } } }[] }>("POST", "/quotes", body),
};
