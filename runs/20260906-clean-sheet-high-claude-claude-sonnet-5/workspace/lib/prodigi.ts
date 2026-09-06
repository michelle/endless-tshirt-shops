// Prodigi Print API (sandbox) integration.
// Docs: https://www.prodigi.com/print-api/docs/reference/
//
// Product: GLOBAL-TEE-GIL-64000 (Unisex Softstyle T-shirt, Gildan 64000).
// One SKU covers every size/color; the variant is selected via `attributes`.

const PRODIGI_BASE_URL = process.env.PRODIGI_API_URL || "https://api.sandbox.prodigi.com/v4.0";
const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY;

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";

// Garment color we print on. "black" reads best against every design's
// full-bleed print, so every shirt in the store uses the same garment.
export const GARMENT_COLOR = "black";

// Store sizes map 1:1 to Prodigi's size attribute values.
export const SIZE_TO_PRODIGI: Record<string, string> = {
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
  "2XL": "2xl",
};

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

export type ProdigiOrderItem = {
  merchantReference: string;
  size: string; // one of SIZE_TO_PRODIGI keys
  copies: number;
  assetUrl: string; // publicly reachable URL to the print-ready PNG
};

export async function createProdigiOrder(opts: {
  merchantReference: string;
  recipient: ProdigiRecipient;
  items: ProdigiOrderItem[];
  idempotencyKey?: string;
}) {
  if (!PRODIGI_API_KEY) {
    throw new Error("PRODIGI_API_KEY is not set");
  }

  const body = {
    merchantReference: opts.merchantReference,
    shippingMethod: "Standard",
    recipient: opts.recipient,
    items: opts.items.map((item) => ({
      merchantReference: item.merchantReference,
      sku: PRODIGI_SKU,
      copies: item.copies,
      sizing: "fillPrintArea",
      attributes: {
        color: GARMENT_COLOR,
        size: SIZE_TO_PRODIGI[item.size] ?? item.size.toLowerCase(),
      },
      assets: [
        {
          printArea: "front",
          url: item.assetUrl,
        },
      ],
    })),
  };

  const res = await fetch(`${PRODIGI_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": PRODIGI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || (json.outcome && json.outcome !== "Created" && json.outcome !== "CreatedWithIssues")) {
    throw new Error(`Prodigi order failed: ${res.status} ${JSON.stringify(json)}`);
  }

  return json;
}
