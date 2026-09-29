// 4000 Fridays — Prodigi Print API v4 client (server only).

import { PRODIGI_API_BASE } from "./config";

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

export interface ProdigiOrderItem {
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes: Record<string, string>;
  recipientCost?: { amount: string; currency: string };
  assets: { printArea: string; url: string; md5Hash?: string }[];
  merchantReference?: string;
}

export interface ProdigiOrderRequest {
  shippingMethod: string;
  idempotencyKey: string;
  merchantReference?: string;
  recipient: ProdigiRecipient;
  items: ProdigiOrderItem[];
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrder {
  id: string;
  status?: {
    stage?: string;
    issues?: { errorCode?: string; description?: string }[];
    details?: Record<string, string>;
  };
  charges?: unknown[];
  shipments?: unknown[];
  [k: string]: unknown;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(PRODIGI_API_BASE + path, {
    method,
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Prodigi ${method} ${path} returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    const msg =
      (json as { message?: string; description?: string }).message ??
      (json as { description?: string }).description ??
      text.slice(0, 300);
    throw new Error(`Prodigi ${method} ${path} failed (${res.status}): ${msg}`);
  }
  return json as T;
}

export async function createProdigiOrder(
  req: ProdigiOrderRequest
): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call("POST", "/orders", req);
}

export async function getProdigiOrder(id: string): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call("GET", `/orders/${encodeURIComponent(id)}`);
}

export async function listProdigiOrders(params: Record<string, string> = {}): Promise<{
  outcome: string;
  orders: ProdigiOrder[];
  hasMore: boolean;
}> {
  const qs = new URLSearchParams(params).toString();
  return call("GET", `/orders${qs ? `?${qs}` : ""}`);
}
