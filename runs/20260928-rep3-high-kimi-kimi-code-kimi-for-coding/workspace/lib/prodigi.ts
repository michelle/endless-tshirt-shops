// Prodigi Print API client (v4.0).

const BASE = () => process.env.PRODIGI_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0";

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: {
      "X-API-Key": process.env.PRODIGI_API_KEY ?? "",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    throw new Error(`Prodigi ${init?.method ?? "GET"} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  return data;
}

export interface ProdigiRecipient {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address: {
    line1: string;
    line2?: string | null;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string | null;
  };
}

export interface ProdigiOrderResult {
  id: string;
  outcome: string;
  stage?: string;
  issues?: { errorCode: string; description: string }[];
}

export async function createProdigiOrder(args: {
  idempotencyKey: string;
  merchantReference: string;
  recipient: ProdigiRecipient;
  item: { sku: string; copies: number; color: string; size: string; assetUrl: string; recipientCost: { amount: string; currency: string } };
}): Promise<ProdigiOrderResult> {
  const data = await api("/Orders", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: args.idempotencyKey,
      merchantReference: args.merchantReference,
      shippingMethod: "Standard",
      recipient: args.recipient,
      items: [
        {
          sku: args.item.sku,
          copies: args.item.copies,
          sizing: "fitPrintArea",
          attributes: { color: args.item.color, size: args.item.size },
          recipientCost: args.item.recipientCost,
          assets: [{ printArea: "front", url: args.item.assetUrl }],
        },
      ],
    }),
  });
  const order = data.order ?? {};
  return {
    id: order.id ?? "",
    outcome: data.outcome ?? "Unknown",
    stage: order.status?.stage,
    issues: (data.issues ?? []).map((i: any) => ({ errorCode: i.errorCode, description: i.description })),
  };
}

/** Find a recent order by merchantReference (orders are returned newest-first). */
export async function findOrderByReference(ref: string): Promise<any | null> {
  const data = await api("/Orders?Top=100");
  const orders: any[] = data.orders ?? [];
  return orders.find((o) => o.merchantReference === ref) ?? null;
}

export async function getOrder(id: string): Promise<any | null> {
  try {
    const data = await api(`/Orders/${encodeURIComponent(id)}`);
    return data.order ?? null;
  } catch {
    return null;
  }
}
