import "server-only";
import { env } from "./env";

export type ProdigiRecipient = {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address: {
    line1: string;
    line2?: string | null;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string | null;
  };
};

export type ProdigiItem = {
  merchantReference: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
};

export type ProdigiOrderRequest = {
  merchantReference: string;
  idempotencyKey: string;
  shippingMethod: string;
  callbackUrl?: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, string>;
};

export type ProdigiOrder = {
  id: string;
  created?: string;
  status?: { stage: string; issues: unknown[]; details: Record<string, string> };
  shipments?: { carrier?: { name: string; service: string }; tracking?: { number: string | null; url: string | null } | null; status?: string }[];
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.prodigiBaseUrl()}${path}`, {
    ...init,
    headers: { "X-API-Key": env.prodigiApiKey(), "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${init.method ?? "GET"} ${path} failed (${res.status}): ${text.slice(0, 800)}`);
  }
  return body as T;
}

/** Creates an order. Safe to retry: Prodigi dedupes on idempotencyKey ("AlreadyExists"). */
export async function createProdigiOrder(order: ProdigiOrderRequest): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call("/orders", { method: "POST", body: JSON.stringify(order) });
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const r = await call<{ order: ProdigiOrder }>(`/orders/${encodeURIComponent(id)}`);
    return r.order;
  } catch (e) {
    console.error(e);
    return null;
  }
}
