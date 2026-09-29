import { prodigiBaseUrl, PRODIGI_SKU } from "./config";

export interface ShippingAddress {
  name: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  countryCode: string;
}

export interface ProdigiItem {
  merchantReference: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes: { color: string; size: string };
  assets: { printArea: string; url: string }[];
}

export interface ProdigiOrder {
  merchantReference: string;
  shippingMethod: string;
  idempotencyKey?: string;
  recipient: {
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
  };
  items: ProdigiItem[];
}

export interface ProdigiOrderResult {
  id: string;
  status: string;
  [key: string]: unknown;
}

export async function createProdigiOrder(
  order: ProdigiOrder
): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");

  const res = await fetch(`${prodigiBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `Prodigi order failed (${res.status}): ${JSON.stringify(data).slice(0, 500)}`
    );
  }

  return data.order ?? data;
}

export function buildProdigiOrder(params: {
  merchantReference: string;
  recipient: ShippingAddress;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  assetUrl: string;
}): ProdigiOrder {
  return {
    merchantReference: params.merchantReference,
    shippingMethod: "Standard",
    idempotencyKey: params.merchantReference,
    recipient: {
      name: params.recipient.name,
      ...(params.recipient.email ? { email: params.recipient.email } : {}),
      address: {
        line1: params.recipient.line1,
        ...(params.recipient.line2 ? { line2: params.recipient.line2 } : {}),
        postalOrZipCode: params.recipient.postalCode,
        countryCode: params.recipient.countryCode,
        townOrCity: params.recipient.city,
        ...(params.recipient.state ? { stateOrCounty: params.recipient.state } : {}),
      },
    },
    items: [
      {
        merchantReference: `${params.merchantReference}-item`,
        sku: params.sku || PRODIGI_SKU,
        copies: params.quantity,
        sizing: "fillPrintArea",
        attributes: { color: params.color, size: params.size },
        assets: [{ printArea: "front", url: params.assetUrl }],
      },
    ],
  };
}
