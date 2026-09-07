import "server-only";
import { SKU, getColor, getDesign, printUrl, isSize } from "./catalog";

const BASE = process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0";

function apiKey() {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

export function isProdigiSandbox() {
  return BASE.includes("sandbox");
}

async function prodigi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
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
    throw new Error(`Prodigi ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return body as T;
}

export type LineItem = { slug: string; color: string; size: string; quantity: number };

export type Address = {
  name: string;
  email: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  countryCode: string; // ISO 3166-1 alpha-2
};

export function validateItems(items: unknown): LineItem[] {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Cart is empty");
  return items.map((raw) => {
    const it = raw as Partial<LineItem>;
    if (!it.slug || !getDesign(it.slug)) throw new Error(`Unknown design: ${it.slug}`);
    if (!it.color || !getColor(it.color)) throw new Error(`Unknown colour: ${it.color}`);
    if (!it.size || !isSize(it.size)) throw new Error(`Unknown size: ${it.size}`);
    const quantity = Math.floor(Number(it.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) throw new Error("Quantity must be 1-20");
    return { slug: it.slug, color: it.color, size: it.size, quantity };
  });
}

function toProdigiItems(items: LineItem[], siteUrl: string) {
  return items.map((it, i) => {
    const color = getColor(it.color)!;
    return {
      merchantReference: `${it.slug}:${it.color}:${it.size}`,
      sku: SKU,
      copies: it.quantity,
      sizing: "fitPrintArea",
      attributes: { color: color.id, size: it.size },
      assets: [{ printArea: "front", url: `${siteUrl}${printUrl(it.slug, color.ink)}` }],
      recipientCost: undefined,
      _i: i,
    };
  }).map(({ _i: _unused, recipientCost: _rc, ...rest }) => rest);
}

export type Quote = {
  shipping: number; // cents
  tax: number; // cents (Prodigi's estimate on the wholesale cost; informational)
  carrier?: string;
  outcome: string;
  issues: string[];
};

export async function getQuote(items: LineItem[], countryCode: string, shippingMethod = "Standard"): Promise<Quote> {
  type Resp = {
    outcome: string;
    issues?: { description: string; errorCode: string }[] | null;
    quotes: {
      costSummary: { shipping: { amount: string }; totalTax: { amount: string } };
      shipments: { carrier: { name: string; service: string } }[];
    }[];
  };
  const body = {
    shippingMethod,
    destinationCountryCode: countryCode,
    currencyCode: "USD",
    items: items.map((it) => ({
      sku: SKU,
      copies: it.quantity,
      attributes: { color: getColor(it.color)!.id, size: it.size },
      assets: [{ printArea: "front" }],
    })),
  };
  const r = await prodigi<Resp>("/quotes", { method: "POST", body: JSON.stringify(body) });
  const q = r.quotes?.[0];
  if (!q) throw new Error(`No quote available for ${countryCode}`);
  return {
    shipping: Math.round(parseFloat(q.costSummary.shipping.amount) * 100),
    tax: Math.round(parseFloat(q.costSummary.totalTax.amount) * 100),
    carrier: q.shipments?.[0] ? `${q.shipments[0].carrier.name} ${q.shipments[0].carrier.service}` : undefined,
    outcome: r.outcome,
    issues: (r.issues ?? []).map((i) => i.description),
  };
}

export type ProdigiOrder = {
  id: string;
  created: string;
  status: { stage: string; details?: Record<string, string>; issues?: { description: string }[] };
  merchantReference?: string;
  shippingMethod: string;
  recipient: { name: string; address: { line1: string; line2?: string; townOrCity: string; stateOrCounty?: string; postalOrZipCode: string; countryCode: string } };
  items: { merchantReference?: string; sku: string; copies: number; attributes: Record<string, string>; status?: string }[];
  shipments?: { carrier?: { name?: string; service?: string }; tracking?: { number?: string; url?: string }; dispatchDate?: string }[];
};

export async function createOrder(opts: {
  items: LineItem[];
  address: Address;
  merchantReference: string;
  siteUrl: string;
  shippingMethod?: string;
  idempotencyKey?: string;
}): Promise<ProdigiOrder> {
  const a = opts.address;
  const body = {
    merchantReference: opts.merchantReference,
    shippingMethod: opts.shippingMethod ?? "Standard",
    idempotencyKey: opts.idempotencyKey ?? opts.merchantReference,
    recipient: {
      name: a.name,
      email: a.email,
      phoneNumber: a.phone || undefined,
      address: {
        line1: a.line1,
        line2: a.line2 || undefined,
        postalOrZipCode: a.postalCode,
        countryCode: a.countryCode,
        townOrCity: a.city,
        stateOrCounty: a.state || undefined,
      },
    },
    items: toProdigiItems(opts.items, opts.siteUrl),
    metadata: { source: "obsolete-guild-store" },
  };
  const r = await prodigi<{ outcome: string; order: ProdigiOrder }>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.order) throw new Error(`Prodigi order not created: ${JSON.stringify(r).slice(0, 300)}`);
  return r.order;
}

export async function getOrder(id: string): Promise<ProdigiOrder | null> {
  if (!/^ord_[A-Za-z0-9]+$/.test(id)) return null;
  try {
    const r = await prodigi<{ outcome: string; order: ProdigiOrder }>(`/orders/${id}`);
    return r.order ?? null;
  } catch (e) {
    if (/\((400|404)\)/.test(String(e))) return null;
    throw e;
  }
}

export async function findOrderByMerchantReference(ref: string): Promise<ProdigiOrder | null> {
  const r = await prodigi<{ orders: ProdigiOrder[] }>(`/orders?top=1&merchantReferences=${encodeURIComponent(ref)}`);
  return r.orders?.[0] ?? null;
}
