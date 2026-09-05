/**
 * A small, typed client for the parts of the Prodigi Print API v4 we use.
 * Docs: https://www.prodigi.com/print-api/docs/reference/
 */

const BASE = (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");

export function prodigiConfigured(): boolean {
  return Boolean(process.env.PRODIGI_API_KEY);
}

export function prodigiIsSandbox(): boolean {
  return BASE.includes("sandbox");
}

function headers(): HeadersInit {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  return { "X-API-Key": key, "Content-Type": "application/json", Accept: "application/json" };
}

export class ProdigiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
    this.name = "ProdigiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) }, cache: "no-store" });
  const text = await res.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  if (!res.ok) {
    const outcome = (body as { outcome?: string } | null)?.outcome;
    throw new ProdigiError(`Prodigi ${init?.method || "GET"} ${path} → ${res.status}${outcome ? ` (${outcome})` : ""}`, res.status, body);
  }
  return body as T;
}

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: ProdigiAddress;
}

export interface ProdigiItem {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes?: Record<string, string>;
  assets: { printArea: string; url: string; md5Hash?: string }[];
}

export interface CreateOrderInput {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey?: string;
  callbackUrl?: string;
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, string | number | boolean>;
}

export interface ProdigiOrder {
  id: string;
  created: string;
  lastUpdated?: string;
  merchantReference?: string;
  shippingMethod?: string;
  idempotencyKey?: string;
  status: {
    stage: "InProgress" | "Complete" | "Cancelled" | "Draft" | string;
    issues?: { objectId?: string; errorCode?: string; description?: string }[];
    details?: Record<string, string>;
  };
  charges?: { totalCost?: { amount: string; currency: string } }[];
  shipments?: { id: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string }[];
  recipient?: ProdigiRecipient;
  items?: (ProdigiItem & { id?: string; status?: string })[];
  metadata?: Record<string, unknown>;
}

interface OrderEnvelope {
  outcome: string;
  order: ProdigiOrder;
  traceParent?: string;
}

interface OrdersListEnvelope {
  outcome: string;
  orders: ProdigiOrder[];
  hasMore?: boolean;
}

export async function createOrder(input: CreateOrderInput): Promise<{ outcome: string; order: ProdigiOrder }> {
  const body = await request<OrderEnvelope>("/orders", { method: "POST", body: JSON.stringify(input) });
  return { outcome: body.outcome, order: body.order };
}

export async function getOrder(id: string): Promise<ProdigiOrder> {
  const body = await request<OrderEnvelope>(`/orders/${encodeURIComponent(id)}`);
  return body.order;
}

export async function findOrderByMerchantReference(ref: string): Promise<ProdigiOrder | null> {
  const qs = new URLSearchParams({ merchantReferences: ref, top: "5" });
  const body = await request<OrdersListEnvelope>(`/orders?${qs.toString()}`);
  const match = (body.orders || []).find((o) => o.merchantReference === ref);
  return match ?? null;
}

export async function getProduct(sku: string): Promise<unknown> {
  return request(`/products/${encodeURIComponent(sku)}`);
}

export interface QuoteInput {
  shippingMethod: CreateOrderInput["shippingMethod"];
  destinationCountryCode: string;
  currencyCode?: string;
  items: { sku: string; copies: number; attributes?: Record<string, string>; assets: { printArea: string }[] }[];
}

export async function quote(input: QuoteInput): Promise<unknown> {
  return request("/quotes", { method: "POST", body: JSON.stringify(input) });
}
