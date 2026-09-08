import "server-only";

const BASE = process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0";

export const isSandbox = () => BASE.includes("sandbox");

function key(): string {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error("PRODIGI_API_KEY is not configured");
  return k;
}

async function call<T>(path: string, init?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key(),
      "Content-Type": "application/json",
      ...(init?.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    throw new ProdigiError(`Prodigi ${init?.method ?? "GET"} ${path} failed (${res.status})`, res.status, body);
  }
  return body as T;
}

export class ProdigiError extends Error {
  constructor(message: string, readonly status: number, readonly body: unknown) {
    super(message);
    this.name = "ProdigiError";
  }
}

export type Cost = { amount: string; currency: string };

export type Quote = {
  shipmentMethod: string;
  costSummary: { items: Cost; shipping: Cost; totalCost?: Cost; totalTax?: Cost };
};

export type ShippingMethod = "Budget" | "Standard" | "Express" | "Overnight";

export type QuoteItem = {
  sku: string;
  copies: number;
  attributes: Record<string, string>;
  assets: { printArea: string }[];
};

export async function getQuotes(args: {
  destinationCountryCode: string;
  currencyCode: string;
  items: QuoteItem[];
  shippingMethod?: ShippingMethod;
}): Promise<Quote[]> {
  const body = await call<{ outcome: string; quotes?: Quote[] }>("/quotes", {
    method: "POST",
    body: JSON.stringify({
      shippingMethod: args.shippingMethod ?? "Budget",
      destinationCountryCode: args.destinationCountryCode,
      currencyCode: args.currencyCode,
      items: args.items,
    }),
  });
  return body.quotes ?? [];
}

export type Recipient = {
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

export type OrderItem = {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
};

export type ProdigiOrder = {
  id: string;
  created: string;
  status: {
    stage: string;
    issues?: { objectId?: string; errorCode: string; description: string }[];
    details?: Record<string, string>;
  };
  charges?: { totalCost?: Cost; items?: Cost[] }[];
  shipments?: {
    id: string;
    carrier?: { name: string; service: string };
    tracking?: { number: string; url: string };
    dispatchDate?: string;
    status?: string;
  }[];
  recipient?: Recipient;
  items?: (OrderItem & { id: string; status?: string })[];
  merchantReference?: string;
};

export async function createOrder(args: {
  merchantReference: string;
  shippingMethod: ShippingMethod;
  recipient: Recipient;
  items: OrderItem[];
  idempotencyKey: string;
}): Promise<ProdigiOrder> {
  const body = await call<{ outcome: string; order: ProdigiOrder }>("/orders", {
    method: "POST",
    idempotencyKey: args.idempotencyKey,
    body: JSON.stringify({
      merchantReference: args.merchantReference,
      shippingMethod: args.shippingMethod,
      idempotencyKey: args.idempotencyKey,
      recipient: args.recipient,
      items: args.items,
    }),
  });
  return body.order;
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  try {
    const body = await call<{ outcome: string; order: ProdigiOrder }>(`/orders/${encodeURIComponent(id)}`);
    return body.order ?? null;
  } catch (e) {
    if (e instanceof ProdigiError && e.status === 404) return null;
    throw e;
  }
}
