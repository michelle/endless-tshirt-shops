// Minimal Prodigi Print API v4 client. Docs: https://www.prodigi.com/print-api/docs/reference/
import { getColor, getProduct, getSize, PRODIGI_SKU } from "./catalog";
import type { CartItem } from "./cart-items";
import { siteUrl } from "./site";

const BASE = process.env.PRODIGI_API_URL || "https://api.sandbox.prodigi.com/v4.0";

function apiKey() {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  return key;
}

export function isProdigiSandbox() {
  return BASE.includes("sandbox");
}

export type ProdigiAddress = {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string;
};

export type ProdigiRecipient = {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: ProdigiAddress;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  lastUpdated: string;
  merchantReference?: string;
  shippingMethod: string;
  status: {
    stage: "InProgress" | "Complete" | "Cancelled" | "Draft" | "AwaitingPayment" | string;
    issues: { objectId: string; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  recipient: ProdigiRecipient;
  items: {
    id: string;
    merchantReference?: string;
    sku: string;
    copies: number;
    status: string;
    attributes: Record<string, string>;
  }[];
  shipments: {
    id: string;
    status: string;
    carrier?: { name: string; service: string };
    tracking?: { number?: string; url?: string };
    dispatchDate?: string;
    items: { itemId: string }[];
  }[];
};

type OrderResponse = {
  outcome: "Created" | "CreatedWithIssues" | "AlreadyExists" | "OnHold" | string;
  order?: ProdigiOrder;
  issues?: unknown[];
  failures?: unknown;
  title?: string;
  detail?: string;
};

async function prodigi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "X-API-Key": apiKey(), "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${res.status} on ${path}: ${text.slice(0, 500)}`);
  }
  return body as T;
}

export type CreateOrderInput = {
  merchantReference: string;
  idempotencyKey: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: ProdigiRecipient;
  items: CartItem[];
  metadata?: Record<string, string>;
};

export function buildOrderItems(items: CartItem[]) {
  const base = siteUrl();
  return items.map((i) => {
    const product = getProduct(i.slug)!;
    const color = getColor(i.color)!;
    const size = getSize(i.size)!;
    return {
      merchantReference: `${i.slug}:${i.color}:${i.size}`,
      sku: PRODIGI_SKU,
      copies: i.qty,
      sizing: "fitPrintArea",
      attributes: { color: color.prodigi, size: size.prodigi },
      assets: [{ printArea: "front", url: `${base}/print/${product.slug}-${color.ink}.png` }],
    };
  });
}

/** Creates an order; safe to call repeatedly with the same idempotencyKey. */
export async function createOrder(input: CreateOrderInput): Promise<{ outcome: string; order: ProdigiOrder }> {
  const body = {
    merchantReference: input.merchantReference,
    idempotencyKey: input.idempotencyKey,
    shippingMethod: input.shippingMethod,
    recipient: input.recipient,
    items: buildOrderItems(input.items),
    metadata: input.metadata ?? {},
  };
  const res = await prodigi<OrderResponse>("/orders", { method: "POST", body: JSON.stringify(body) });
  if (res.outcome === "AlreadyExists" && res.order?.id) {
    // Prodigi returns only { id } for duplicates; load the full order.
    const existing = await getOrder(res.order.id);
    if (existing) return { outcome: res.outcome, order: existing };
  }
  if (!res.order?.status) {
    throw new Error(`Prodigi order not created: ${JSON.stringify(res).slice(0, 1500)}`);
  }
  return { outcome: res.outcome, order: res.order };
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  if (!/^ord_[0-9]+$/.test(id)) return null;
  try {
    const res = await prodigi<{ outcome: string; order?: ProdigiOrder }>(`/orders/${id}`);
    return res.order ?? null;
  } catch (e) {
    if (String(e).includes("Prodigi 404")) return null;
    throw e;
  }
}

/** Human-readable label for Prodigi's status stage / details. */
export function describeStatus(order: ProdigiOrder): { label: string; step: number } {
  const d = order.status.details || {};
  if (order.status.stage === "Cancelled") return { label: "Cancelled", step: 0 };
  if (order.status.stage === "Complete" || d.shipping === "Complete") return { label: "Shipped", step: 4 };
  if (d.shipping === "InProgress") return { label: "Packing & shipping", step: 3 };
  if (d.allocateProductionLocation === "Complete") return { label: "In production", step: 2 };
  return { label: "Received by print lab", step: 1 };
}
