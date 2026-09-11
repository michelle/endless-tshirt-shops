import { PRODIGI_SKU } from "./product";

const PRODIGI_BASE_URL = process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";

export interface ProdigiRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    townOrCity: string;
    stateOrCounty?: string;
    postalOrZipCode: string;
    countryCode: string;
  };
}

export interface CreateProdigiOrderArgs {
  merchantReference: string;
  idempotencyKey: string;
  recipient: ProdigiRecipient;
  copies: number;
  color: string;
  size: string;
  artworkUrl: string;
}

export interface ProdigiOrderResult {
  ok: boolean;
  status?: number;
  orderId?: string;
  orderStatus?: string;
  raw: unknown;
}

export async function createProdigiOrder(args: CreateProdigiOrderArgs): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not set");

  const body = {
    merchantReference: args.merchantReference,
    shippingMethod: "Standard",
    idempotencyKey: args.idempotencyKey,
    recipient: args.recipient,
    items: [
      {
        sku: PRODIGI_SKU,
        copies: args.copies,
        merchantReference: args.merchantReference,
        sizing: "fitPrintArea",
        attributes: {
          color: args.color,
          size: args.size,
        },
        assets: [
          {
            printArea: "front",
            url: args.artworkUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${PRODIGI_BASE_URL}/Orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  const order = json?.order;
  return {
    ok: res.ok && (json?.outcome === "Created" || json?.outcome === "CreatedWithIssues"),
    status: res.status,
    orderId: order?.id,
    orderStatus: order?.status?.stage,
    raw: json,
  };
}
