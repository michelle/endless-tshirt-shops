import { PRODIGI_SKU, SHIRT_COLORS } from "./catalog";
import type { CartItem } from "./design";

const BASE = process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";

async function call(pathname: string, init: RequestInit = {}) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(BASE + pathname, {
    ...init,
    headers: { "X-API-Key": key, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

const prodigiColor = (id: string) => SHIRT_COLORS.find((c) => c.id === id)!.prodigi;

export class PermanentError extends Error {}

export async function quoteShipping(country: string, items: CartItem[]): Promise<number> {
  const r = await call("/quotes", {
    method: "POST",
    body: JSON.stringify({
      shippingMethod: "Standard",
      destinationCountryCode: country,
      currencyCode: "USD",
      items: items.map((i) => ({
        sku: PRODIGI_SKU, copies: i.qty,
        attributes: { color: prodigiColor(i.design.shirt), size: i.size },
        assets: [{ printArea: "front" }],
      })),
    }),
  });
  const q = r.json?.quotes?.[0];
  if (!q || !["Created", "CreatedWithIssues"].includes(r.json?.outcome)) {
    throw new PermanentError(`Cannot quote shipping to ${country}: ${r.text.slice(0, 300)}`);
  }
  return Math.round(parseFloat(q.costSummary.shipping.amount) * 100);
}

export type Recipient = {
  name: string; email?: string | null; phone?: string | null;
  address: { line1: string; line2?: string | null; postalOrZipCode: string; countryCode: string; townOrCity: string; stateOrCounty?: string | null };
};

export type OrderItem = { reference: string; item: CartItem; printUrl: string };

/** Creates the order, or returns the existing one thanks to idempotencyKey. */
export async function createOrder(args: { reference: string; recipient: Recipient; items: OrderItem[] }): Promise<{ id: string; outcome: string }> {
  const r = await call("/orders", {
    method: "POST",
    body: JSON.stringify({
      merchantReference: args.reference,
      idempotencyKey: args.reference,
      shippingMethod: "Standard",
      recipient: args.recipient,
      items: args.items.map((o) => ({
        merchantReference: o.reference,
        sku: PRODIGI_SKU,
        copies: o.item.qty,
        // fit (not fill): never crop the artwork whichever lab's print area is used
        sizing: "fitPrintArea",
        attributes: { color: prodigiColor(o.item.design.shirt), size: o.item.size },
        assets: [{ printArea: "front", url: o.printUrl }],
      })),
    }),
  });
  const id = r.json?.order?.id;
  if (r.status >= 200 && r.status < 300 && id && ["Created", "CreatedWithIssues", "AlreadyExists"].includes(r.json.outcome)) {
    return { id, outcome: r.json.outcome };
  }
  if (r.status >= 400 && r.status < 500 && r.status !== 429) throw new PermanentError(`Prodigi rejected order: ${r.text.slice(0, 600)}`);
  throw new Error(`Prodigi error ${r.status}: ${r.text.slice(0, 300)}`);
}

export async function getOrder(id: string) {
  const r = await call(`/orders/${encodeURIComponent(id)}`);
  return r.status === 200 ? (r.json?.order ?? null) : null;
}
