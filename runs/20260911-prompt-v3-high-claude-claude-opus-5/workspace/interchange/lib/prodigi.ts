const BASE = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

export const TEE_SKU = "GLOBAL-TEE-GIL-64000";

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  merchantReference: string;
  shippingMethod: string;
  status: {
    stage: string;
    issues: { objectId?: string | null; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  recipient: { name: string; email?: string | null; address: ProdigiAddress };
  items: {
    id: string;
    status: string;
    sku: string;
    copies: number;
    attributes: Record<string, string>;
    assets: { printArea: string; url: string; status: string }[];
  }[];
  shipments: {
    id: string;
    carrier?: { name: string; service: string } | null;
    tracking?: { number: string; url: string } | null;
    dispatchDate?: string | null;
  }[];
};

function key(): string {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error("PRODIGI_API_KEY is not configured");
  return k;
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key(),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const detail = body?.outcome || body?.message || text.slice(0, 300) || res.statusText;
    throw new Error(`Prodigi ${res.status}: ${detail}`);
  }
  return body;
}

export type CreateOrderInput = {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: { name: string; email?: string; phoneNumber?: string; address: ProdigiAddress };
  items: {
    merchantReference: string;
    sku: string;
    copies: number;
    attributes: { color: string; size: string };
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, string | number | boolean>;
};

export async function createOrder(input: CreateOrderInput): Promise<ProdigiOrder> {
  const body = await call("/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.merchantReference },
    body: JSON.stringify({
      ...input,
      items: input.items.map((i) => ({ ...i, sizing: "fillPrintArea" })),
    }),
  });
  return body.order as ProdigiOrder;
}

/** Exact-match lookup. Prodigi's filter is fuzzy, so we re-check client side. */
export async function findByReference(ref: string): Promise<ProdigiOrder | null> {
  const body = await call(`/orders?merchantReferences=${encodeURIComponent(ref)}&top=25`);
  const orders: ProdigiOrder[] = body?.orders || [];
  return orders.find((o) => o.merchantReference === ref) || null;
}

/** Human-readable progress for the order status page. */
export function describeStage(o: ProdigiOrder): { label: string; detail: string; done: boolean } {
  const d = o.status.details || {};
  const stage = o.status.stage;
  if (stage === "Cancelled") return { label: "Cancelled", detail: "This order was cancelled.", done: true };
  if (stage === "Complete" || d.shipping === "Complete")
    return { label: "Shipped", detail: "Your shirt is on its way.", done: true };
  if (d.inProduction === "InProgress" || d.inProduction === "Complete")
    return { label: "In production", detail: "Your shirt is being printed.", done: false };
  if (d.allocateProductionLocation === "Complete")
    return { label: "Assigned to a print lab", detail: "A print partner has picked up your order.", done: false };
  if (
    d.printReadyAssetsPrepared === "InProgress" ||
    d.printReadyAssetsPrepared === "Complete" ||
    d.downloadAssets === "Complete"
  )
    return { label: "Preparing print file", detail: "Your artwork is with the press and is being prepared.", done: false };
  return { label: "Received", detail: "We have your order and your artwork.", done: false };
}
