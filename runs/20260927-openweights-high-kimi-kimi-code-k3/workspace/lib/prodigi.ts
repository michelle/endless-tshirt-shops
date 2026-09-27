import crypto from "node:crypto";

const BASE = () =>
  process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com";
const KEY = () => process.env.PRODIGI_API_KEY || "";

export const TEE_SKU = "GLOBAL-TEE-BC-3001";

export interface Recipient {
  name: string;
  email?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
}

export async function createShirtOrder(args: {
  ref: string;
  artUrl: string;
  size: string;
  color: string;
  recipient: Recipient;
}): Promise<{ id: string; stage: string; raw: any }> {
  const body = {
    merchantReference: args.ref,
    idempotencyKey: crypto
      .createHash("sha256")
      .update(`starmark:${args.ref}`)
      .digest("hex")
      .slice(0, 40),
    shippingMethod: "Standard",
    recipient: args.recipient,
    items: [
      {
        merchantReference: `${args.ref}-tee`,
        sku: TEE_SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: { size: args.size, color: args.color },
        assets: [{ printArea: "front", url: args.artUrl }],
      },
    ],
    metadata: { store: "starmark", art: args.artUrl.slice(0, 400) },
  };
  const res = await fetch(`${BASE()}/v4.0/orders`, {
    method: "POST",
    headers: { "X-API-Key": KEY(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  const outcome = String(json.outcome || "");
  if (!res.ok || (outcome && !outcome.startsWith("Created"))) {
    throw new Error(
      `Prodigi order failed (${res.status}): ${JSON.stringify(json).slice(
        0,
        600
      )}`
    );
  }
  const order = json.order ?? json;
  return {
    id: order.id,
    stage: order.status?.stage ?? "Unknown",
    raw: order,
  };
}

export async function findOrderByRef(ref: string): Promise<{
  found: boolean;
  id?: string;
  stage?: string;
  issues?: string[];
}> {
  const res = await fetch(`${BASE()}/v4.0/orders?top=100`, {
    headers: { "X-API-Key": KEY() },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { found: false };
  const orders: any[] = json.orders ?? [];
  const match = orders.find((o) => o.merchantReference === ref);
  if (!match) return { found: false };
  return {
    found: true,
    id: match.id,
    stage: match.status?.stage,
    issues: (match.status?.issues ?? []).map((i: any) =>
      typeof i === "string" ? i : i.description ?? i.errorCode ?? "issue"
    ),
  };
}
