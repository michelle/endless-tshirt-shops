/**
 * Prodigi Print API client (v4.0, sandbox in this build). Orders are only
 * ever created after Stripe confirms payment; the order carries the Stripe
 * session id as both merchantReference and idempotencyKey so webhook retries
 * can never print a shirt twice.
 */

const BASE =
  process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
}

export interface ProdigiOrderItem {
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes: Record<string, string>;
  recipientCost: { amount: string; currency: string };
  assets: { printArea: string; url: string }[];
  merchantReference?: string;
}

export interface ProdigiOrderRequest {
  shippingMethod: "Budget" | "Standard" | "StandardPlus" | "Express" | "Overnight";
  idempotencyKey: string;
  merchantReference: string;
  recipient: {
    name: string;
    email?: string;
    phoneNumber?: string;
    address: ProdigiAddress;
  };
  items: ProdigiOrderItem[];
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface ProdigiOrder {
  id: string;
  status?: { stage?: string; issues?: unknown[]; details?: Record<string, string> };
  items?: { id: string; status?: string }[];
}

export class ProdigiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly outcome: string | undefined,
    readonly body: unknown
  ) {
    super(message);
    this.name = "ProdigiError";
  }
}

async function prodigi<T>(
  path: string,
  init: { method: string; body?: unknown }
): Promise<{ outcome?: string; status: number; data: T }> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new ProdigiError("PRODIGI_API_KEY is not configured", 500, undefined, null);

  const res = await fetch(`${BASE}${path}`, {
    method: init.method,
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      ...(init.body ? { "Content-Length": String(Buffer.byteLength(JSON.stringify(init.body))) } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const outcome = (data as { outcome?: string } | null)?.outcome;

  if (!res.ok && !(res.status >= 200 && res.status < 300)) {
    const detail = (data as { message?: string; debugDetails?: unknown } | null)?.message;
    throw new ProdigiError(
      `Prodigi ${path} failed (${res.status} ${outcome ?? ""}): ${detail ?? ""}`,
      res.status,
      outcome,
      data
    );
  }

  return { outcome, status: res.status, data: data as T };
}

/** Create a print order. Idempotent on the caller's idempotencyKey. */
export async function createOrder(
  req: ProdigiOrderRequest
): Promise<{ order: ProdigiOrder; outcome: string }> {
  const { data } = await prodigi<{ outcome: string; order: ProdigiOrder }>("/orders", {
    method: "POST",
    body: req,
  });
  if (!data.order) throw new ProdigiError("Prodigi returned no order", 500, data.outcome, data);
  return { order: data.order, outcome: data.outcome };
}

/** Fetch an order by Prodigi id (used for status display). */
export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const { data } = await prodigi<{ order?: ProdigiOrder }>(
      `/orders/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
    return data.order ?? null;
  } catch {
    return null;
  }
}
