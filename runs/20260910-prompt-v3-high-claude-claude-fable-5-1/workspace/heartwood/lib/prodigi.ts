/** Minimal Prodigi Print API v4 client. Sandbox by default; set PRODIGI_API_BASE for live. */

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
};

export type ProdigiOrderRequest = {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  idempotencyKey: string;
  callbackUrl?: string;
  recipient: { name: string; email?: string | null; phoneNumber?: string | null; address: ProdigiAddress };
  items: {
    merchantReference: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, string>;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  lastUpdated: string;
  merchantReference: string;
  shippingMethod: string;
  status: {
    stage: "InProgress" | "Complete" | "Cancelled" | string;
    issues: { objectId?: string | null; errorCode: string; description: string }[];
    details: Record<string, string>;
  };
  shipments: {
    id: string;
    carrier?: { name?: string; service?: string } | null;
    tracking?: { number?: string | null; url?: string | null } | null;
    dispatchDate?: string | null;
    items?: { itemId: string }[];
  }[];
  recipient: { name: string; address: ProdigiAddress };
  items: { id: string; status: string; sku: string; copies: number; attributes: Record<string, string> }[];
};

function base(): string {
  return (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com").replace(/\/$/, "");
}

function headers(): Record<string, string> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not set");
  return { "X-API-Key": key, "Content-Type": "application/json" };
}

export function prodigiIsSandbox(): boolean {
  return base().includes("sandbox");
}

export async function createProdigiOrder(req: ProdigiOrderRequest): Promise<{ outcome: string; order: ProdigiOrder }> {
  const res = await fetch(`${base()}/v4.0/Orders`, { method: "POST", headers: headers(), body: JSON.stringify(req) });
  const text = await res.text();
  let json: { outcome?: string; order?: ProdigiOrder; issues?: unknown } = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* fall through */
  }
  if (!res.ok || !json.order) {
    throw new Error(`Prodigi order creation failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return { outcome: json.outcome ?? "Unknown", order: json.order };
}

export async function getProdigiOrder(id: string): Promise<ProdigiOrder | null> {
  const res = await fetch(`${base()}/v4.0/Orders/${encodeURIComponent(id)}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Prodigi order lookup failed (${res.status})`);
  const json = (await res.json()) as { order?: ProdigiOrder };
  return json.order ?? null;
}

/** Human-friendly summary of where an order is. */
export function describeStage(o: ProdigiOrder): { title: string; detail: string; done: boolean } {
  const d = o.status.details || {};
  if (o.status.stage === "Cancelled") return { title: "Cancelled", detail: "This order was cancelled.", done: true };
  if (o.status.stage === "Complete" || d.shipping === "Complete")
    return { title: "Shipped", detail: "Your shirt is on its way.", done: true };
  if (d.inProduction === "InProgress" || d.inProduction === "Complete")
    return { title: "Printing", detail: "Your rings are being printed onto the shirt right now.", done: false };
  if (d.allocateProductionLocation === "Complete")
    return { title: "Queued for printing", detail: "Assigned to the nearest print lab.", done: false };
  return { title: "Preparing", detail: "Your print file has been generated and sent to the lab.", done: false };
}
