import { STYLES } from "./catalog";
import { blankToNull, type OrderRecord } from "./orderData";

const PRODIGI_BASE = process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0";

export type ProdigiOrderResult = {
  outcome: string;
  orderId?: string;
  raw: unknown;
};

export async function createProdigiOrder(
  order: OrderRecord,
  printFileUrl: string,
  merchantReference: string
): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not set");

  const sku = STYLES[order.style].sku;

  const body = {
    merchantReference,
    shippingMethod: "Standard",
    idempotencyKey: merchantReference,
    recipient: {
      name: order.shipName,
      email: blankToNull(order.shipEmail),
      phoneNumber: blankToNull(order.shipPhone),
      address: {
        line1: order.shipLine1,
        line2: blankToNull(order.shipLine2),
        postalOrZipCode: order.shipPostal,
        countryCode: order.shipCountry,
        townOrCity: order.shipCity,
        stateOrCounty: blankToNull(order.shipState),
      },
    },
    items: [
      {
        merchantReference: `${merchantReference}-item`,
        sku,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: {
          color: order.color,
          size: order.size,
        },
        assets: [
          {
            printArea: "front",
            url: printFileUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${PRODIGI_BASE}/Orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Idempotency-Key": merchantReference,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `Prodigi order creation failed (${res.status}): ${JSON.stringify(json)}`
    );
  }

  return {
    outcome: json.outcome ?? "Unknown",
    orderId: json.order?.id,
    raw: json,
  };
}

export async function getProdigiOrder(orderId: string): Promise<unknown> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(`${PRODIGI_BASE}/Orders/${orderId}`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error(`Failed to fetch Prodigi order ${orderId}: ${res.status}`);
  return res.json();
}
