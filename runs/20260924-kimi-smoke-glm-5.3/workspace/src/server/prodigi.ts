/**
 * Prodigi Print API v4 client (sandbox by default). Orders are created
 * idempotently on the Stripe session id, so webhook retries can never
 * double-print a shirt.
 */
import { PRODIGI_SKU } from "@/lib/products";

const BASE = process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";

export interface ProdigiRecipient {
  name: string;
  email?: string;
  address: {
    line1: string;
    line2?: string;
    townOrCity: string;
    stateOrCounty?: string;
    postalOrZipCode: string;
    countryCode: string;
  };
}

export interface CreateOrderArgs {
  merchantReference: string;
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  color: string;
  size: string;
  artworkUrl: string;
  recipientCost: { amount: string; currency: string };
}

export interface ProdigiResult {
  ok: boolean;
  duplicate: boolean;
  orderId?: string;
  stage?: string;
  error?: string;
  raw?: unknown;
}

function headers(): Record<string, string> {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  return { "X-API-Key": key, "Content-Type": "application/json" };
}

export async function createProdigiOrder(args: CreateOrderArgs): Promise<ProdigiResult> {
  const body = {
    merchantReference: args.merchantReference,
    shippingMethod: "Standard",
    idempotencyKey: args.idempotencyKey,
    recipient: args.recipient,
    items: [
      {
        sku: PRODIGI_SKU,
        copies: 1,
        merchantReference: args.merchantReference,
        sizing: "fitPrintArea",
        attributes: { color: args.color, size: args.size },
        recipientCost: args.recipientCost,
        assets: [{ printArea: "front", url: args.artworkUrl }],
      },
    ],
    metadata: { source: "skyborn", paymentRef: args.merchantReference },
  };

  let res: Response;
  try {
    res = await fetch(`${BASE}/Orders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    return { ok: false, duplicate: false, error: `network error: ${(e as Error).message}` };
  }

  const json = (await res.json().catch(() => null)) as any;
  const outcome = json?.outcome as string | undefined;
  const order = json?.order;
  if (res.ok && (outcome === "Created" || outcome === "CreatedWithIssues" || outcome === "AlreadyExists")) {
    return {
      ok: true,
      duplicate: outcome === "AlreadyExists",
      orderId: order?.id,
      stage: order?.status?.stage,
      raw: json,
    };
  }
  return {
    ok: false,
    duplicate: false,
    error: `outcome=${outcome ?? res.status} ${res.status}`,
    raw: json,
  };
}

export interface ProdigiOrderLookup {
  found: boolean;
  orderId?: string;
  stage?: string;
  details?: Record<string, string>;
  issues?: string[];
  shipments?: Array<{ status?: string; carrier?: string; trackingUrl?: string }>;
}

/** Find the order we previously created for a merchant reference. */
export async function findProdigiOrder(merchantReference: string): Promise<ProdigiOrderLookup> {
  const url = `${BASE}/Orders?merchantReferences=${encodeURIComponent(merchantReference)}&top=1`;
  let res: Response;
  try {
    res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(15_000) });
  } catch {
    return { found: false };
  }
  if (!res.ok) return { found: false };
  const json = (await res.json().catch(() => null)) as any;
  const order = json?.orders?.[0];
  if (!order) return { found: false };
  return {
    found: true,
    orderId: order.id,
    stage: order.status?.stage,
    details: order.status?.details,
    issues: order.status?.issues,
    shipments: (order.shipments ?? []).map((s: any) => ({
      status: s.status,
      carrier: s.carrier?.name,
      trackingUrl: s.tracking?.url,
    })),
  };
}
