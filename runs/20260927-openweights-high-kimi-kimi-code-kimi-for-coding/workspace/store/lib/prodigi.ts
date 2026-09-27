// Minimal Prodigi Print API v4 client (sandbox or live, base-url driven).

const BASE = () => process.env.PRODIGI_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0";
const KEY = () => process.env.PRODIGI_API_KEY;

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: {
      "X-API-Key": KEY() ?? "",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave null */
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${init.method ?? "GET"} ${path} failed: HTTP ${res.status} ${text.slice(0, 400)}`);
  }
  return json;
}

export interface ProdigiAddress {
  line1: string;
  line2?: string;
  townOrCity: string;
  stateOrCounty?: string;
  postalOrZipCode: string;
  countryCode: string;
}

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: ProdigiAddress;
}

export interface ProdigiOrderPayload {
  merchantReference: string;
  shippingMethod: string;
  recipient: ProdigiRecipient;
  items: {
    sku: string;
    copies: number;
    sizing: string;
    attributes: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
}

export function createProdigiOrder(payload: ProdigiOrderPayload, idempotencyKey: string) {
  return call("/Orders", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export async function findOrderByMerchantReference(ref: string): Promise<any | null> {
  const data = await call(`/Orders?merchantReference=${encodeURIComponent(ref)}`);
  const orders: any[] = data?.orders ?? [];
  return orders.find((o) => o.merchantReference === ref) ?? null;
}
