/** Prodigi Print API v4 client — just the calls this store makes. */

const BASE =
  process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0";

/** Gildan 64000 unisex softstyle tee — front print area 4665 x 5844. */
export const TEE_SKU = "GLOBAL-TEE-GIL-64000";

export type ProdigiRecipient = {
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

export type ProdigiItem = {
  merchantReference: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea";
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
};

export type ProdigiOrderRequest = {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  metadata?: Record<string, unknown>;
};

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return key;
}

export async function createOrder(
  order: ProdigiOrderRequest,
  idempotencyKey: string,
): Promise<{ ok: true; id: string; raw: unknown } | { ok: false; error: string; raw: unknown }> {
  const res = await fetch(`${BASE}/Orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      // Sent for forward compatibility; Prodigi does not currently honour it,
      // which is why callers must check findOrderIdByMerchantReference first.
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(order),
  });

  let body: any = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok || body?.outcome === "ValidationFailed") {
    return {
      ok: false,
      error: `Prodigi ${res.status} ${body?.outcome ?? ""}: ${JSON.stringify(
        body?.issues ?? body ?? {},
      ).slice(0, 800)}`,
      raw: body,
    };
  }
  const id = body?.order?.id;
  if (!id) return { ok: false, error: "Prodigi response had no order id", raw: body };
  return { ok: true, id, raw: body };
}

/**
 * Look up an order we previously submitted under `ref`.
 *
 * Prodigi has no idempotency-key support (both `Idempotency-Key` and
 * `X-Idempotency-Key` create a second order), so this lookup is what actually
 * stops a retried webhook from printing the same shirts twice.
 */
export async function findOrderIdByMerchantReference(ref: string): Promise<string | null> {
  const url = `${BASE}/Orders?merchantReferences=${encodeURIComponent(ref)}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const orders: unknown[] = body?.orders ?? [];
  for (const o of orders) {
    const order = o as { id?: string; merchantReference?: string };
    // The filter is server-side, but confirm rather than trust it.
    if (order.merchantReference === ref && order.id) return order.id;
  }
  return null;
}

export async function getOrder(id: string): Promise<any | null> {
  const res = await fetch(`${BASE}/Orders/${encodeURIComponent(id)}`, {
    headers: { "X-API-Key": apiKey() },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}
