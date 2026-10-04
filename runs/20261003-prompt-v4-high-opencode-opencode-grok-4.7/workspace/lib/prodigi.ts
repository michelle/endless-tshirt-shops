import { SKU } from "./catalog";

const API = "https://api.sandbox.prodigi.com/v4.0";

function key(): string {
  const value = process.env.PRODIGI_API_KEY;
  if (!value) throw new Error("PRODIGI_API_KEY is not set");
  return value;
}

export type Quote = {
  method: string;
  itemCents: number;
  shippingCents: number;
  currency: string;
};

function moneyToCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

export async function quoteOrder(opts: {
  country: string;
  method: "Budget" | "Standard" | "Express";
  color: string;
  size: string;
  copies: number;
}): Promise<Quote> {
  const res = await fetch(`${API}/quotes`, {
    method: "POST",
    headers: {
      "X-API-Key": key(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shippingMethod: opts.method,
      destinationCountryCode: opts.country,
      currencyCode: "USD",
      items: [
        {
          sku: SKU,
          copies: opts.copies,
          attributes: { color: opts.color, size: opts.size },
          assets: [{ printArea: "front" }],
        },
      ],
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.quotes?.[0]) {
    const detail = data?.failures ? JSON.stringify(data.failures).slice(0, 240) : data?.outcome;
    throw new Error(detail || "We couldn’t price shipping to that country.");
  }
  const quote = data.quotes[0];
  const currency = quote.costSummary?.shipping?.currency || quote.costSummary?.items?.currency || "USD";
  if (currency !== "USD") {
    throw new Error(`Prodigi quoted ${currency}, not USD.`);
  }
  return {
    method: quote.shipmentMethod || opts.method,
    itemCents: moneyToCents(quote.costSummary.items.amount),
    shippingCents: moneyToCents(quote.costSummary.shipping.amount),
    currency,
  };
}

export type CreatedOrder = {
  id: string;
  stage: string;
  alreadyExisted: boolean;
};

export async function createOrder(opts: {
  idempotencyKey: string;
  merchantReference: string;
  shippingMethod: string;
  recipient: {
    name: string;
    email: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
  };
  color: string;
  size: string;
  copies: number;
  assetUrl: string;
  recipientCost: string;
}): Promise<CreatedOrder> {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": key(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      merchantReference: opts.merchantReference,
      shippingMethod: opts.shippingMethod,
      idempotencyKey: opts.idempotencyKey,
      recipient: {
        name: opts.recipient.name,
        email: opts.recipient.email,
        phoneNumber: opts.recipient.phone || undefined,
        address: {
          line1: opts.recipient.line1,
          line2: opts.recipient.line2 || undefined,
          postalOrZipCode: opts.recipient.zip,
          countryCode: opts.recipient.country,
          townOrCity: opts.recipient.city,
          stateOrCounty: opts.recipient.state || undefined,
        },
      },
      items: [
        {
          merchantReference: opts.merchantReference,
          sku: SKU,
          copies: opts.copies,
          sizing: "fillPrintArea",
          attributes: { color: opts.color, size: opts.size },
          recipientCost: { amount: opts.recipientCost, currency: "USD" },
          assets: [{ printArea: "front", url: opts.assetUrl }],
        },
      ],
      metadata: { source: "stillpoint" },
    }),
  });
  const data = await res.json().catch(() => ({}));
  const outcome = String(data.outcome || "");
  if (!res.ok || !data.order?.id) {
    const detail = data?.failures ? JSON.stringify(data.failures).slice(0, 400) : outcome || res.statusText;
    throw new Error(detail || "Prodigi rejected the order.");
  }
  return {
    id: data.order.id,
    stage: data.order.status?.stage || outcome,
    alreadyExisted: outcome.toLowerCase() === "alreadyexists",
  };
}

export async function getOrder(id: string): Promise<{
  id: string;
  stage: string;
  issues: string[];
  shipments: Array<{ carrier?: string; tracking?: string; url?: string; status?: string }>;
}> {
  const res = await fetch(`${API}/orders/${encodeURIComponent(id)}`, {
    headers: { "X-API-Key": key() },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.order) throw new Error("Could not read that print order.");
  const order = data.order;
  return {
    id: order.id,
    stage: order.status?.stage || "Unknown",
    issues: (order.status?.issues || []).map((issue: { description?: string; errorCode?: string }) => issue.description || issue.errorCode || "Issue"),
    shipments: (order.shipments || []).map((s: { carrier?: { name?: string }; tracking?: { number?: string; url?: string }; status?: string }) => ({
      carrier: s.carrier?.name,
      tracking: s.tracking?.number,
      url: s.tracking?.url,
      status: s.status,
    })),
  };
}
