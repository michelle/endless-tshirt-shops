// Minimal Prodigi Print API v4 client (https://www.prodigi.com/print-api/docs/reference/).
// PRODIGI_API_KEY selects sandbox vs live automatically: sandbox keys only work
// against the sandbox host, so PRODIGI_ENV=live must be set explicitly for production.
import "server-only";
import { CartLine, PRODIGI_SKU, getColor, getDesign } from "./catalog";

const BASE = process.env.PRODIGI_ENV === "live" ? "https://api.prodigi.com/v4.0" : "https://api.sandbox.prodigi.com/v4.0";

export function prodigiEnv() {
  return process.env.PRODIGI_ENV === "live" ? "live" : "sandbox";
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "X-API-Key": key, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const b = body as { outcome?: string; issues?: { description?: string }[] } | string;
    const detail = typeof b === "string" ? b : b?.issues?.map((i) => i.description).join("; ") || b?.outcome || res.statusText;
    throw new Error(`Prodigi ${res.status}: ${detail}`);
  }
  return body as T;
}

export type Recipient = {
  name: string;
  email: string;
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

export type ShippingMethod = "Budget" | "Standard" | "Express" | "Overnight";

export type Quote = {
  shipmentMethod: ShippingMethod;
  costSummary: {
    items: { amount: string; currency: string };
    shipping: { amount: string; currency: string };
    totalCost: { amount: string; currency: string };
  };
};

function itemsForProdigi(lines: CartLine[], assetBaseUrl: string) {
  return lines.map((l, i) => {
    const design = getDesign(l.slug)!;
    const color = getColor(l.color)!;
    return {
      merchantReference: `${i + 1}-${l.slug}-${l.color}-${l.size}`,
      sku: PRODIGI_SKU,
      copies: l.qty,
      sizing: "fitPrintArea",
      attributes: { color: color.prodigi, size: l.size },
      assets: [{ printArea: "front", url: `${assetBaseUrl}/print/${design.slug}.png` }],
    };
  });
}

export async function getQuotes(lines: CartLine[], countryCode: string): Promise<Quote[]> {
  const res = await call<{ outcome: string; quotes: Quote[] }>("/quotes", {
    method: "POST",
    body: JSON.stringify({
      destinationCountryCode: countryCode,
      currencyCode: "USD",
      items: lines.map((l) => ({
        sku: PRODIGI_SKU,
        copies: l.qty,
        attributes: { color: getColor(l.color)!.prodigi, size: l.size },
        assets: [{ printArea: "front" }],
      })),
    }),
  });
  return res.quotes ?? [];
}

export type ProdigiOrder = {
  id: string;
  created: string;
  lastUpdated: string;
  merchantReference: string | null;
  shippingMethod: string;
  status: {
    stage: "InProgress" | "Complete" | "Cancelled" | "Draft" | "AwaitingPayment" | string;
    issues: { errorCode?: string; description?: string }[];
    details: Record<string, string>;
  };
  shipments: { id: string; carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string; items?: { itemId: string }[] }[];
  recipient: Recipient;
  items: { id: string; merchantReference?: string; sku: string; copies: number; attributes: Record<string, string>; status?: string }[];
  metadata: Record<string, unknown> | null;
};

export async function createOrder(args: {
  merchantReference: string;
  idempotencyKey?: string;
  shippingMethod: ShippingMethod;
  recipient: Recipient;
  lines: CartLine[];
  assetBaseUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ outcome: string; order: ProdigiOrder }> {
  return call("/Orders", {
    method: "POST",
    body: JSON.stringify({
      merchantReference: args.merchantReference,
      idempotencyKey: args.idempotencyKey,
      shippingMethod: args.shippingMethod,
      recipient: args.recipient,
      items: itemsForProdigi(args.lines, args.assetBaseUrl),
      metadata: args.metadata,
    }),
  });
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  if (!/^ord_[A-Za-z0-9]+$/.test(id)) return null;
  try {
    const res = await call<{ outcome: string; order: ProdigiOrder }>(`/Orders/${id}`);
    return res.order ?? null;
  } catch (e) {
    if (String(e).includes("404")) return null;
    throw e;
  }
}
