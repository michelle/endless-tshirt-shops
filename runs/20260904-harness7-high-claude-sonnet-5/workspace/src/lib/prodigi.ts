import "server-only";

// Prodigi Print API v4 client. Defaults to the sandbox host — sandbox orders
// are validated and priced like real ones but are never sent to production
// and never charge anything. Flip PRODIGI_API_BASE to the live host (and use
// a live key) when the shop is ready for real customers.
const PRODIGI_API_BASE =
  process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com/v4.0";
const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY;

export interface ProdigiAddress {
  line1: string;
  line2?: string | null;
  townOrCity: string;
  stateOrCounty?: string | null;
  postalOrZipCode: string;
  countryCode: string;
}

export interface CreateProdigiOrderParams {
  merchantReference: string;
  recipientName: string;
  recipientEmail: string;
  address: ProdigiAddress;
  sku: string;
  color: string;
  size: string;
  artworkUrl: string;
}

export interface ProdigiOrderResult {
  outcome: string;
  orderId: string | null;
  status: string | null;
  raw: unknown;
}

export async function createProdigiOrder(
  params: CreateProdigiOrderParams,
): Promise<ProdigiOrderResult> {
  if (!PRODIGI_API_KEY) {
    throw new Error("PRODIGI_API_KEY is not set");
  }

  const body = {
    merchantReference: params.merchantReference,
    shippingMethod: "Standard",
    recipient: {
      name: params.recipientName,
      email: params.recipientEmail,
      address: {
        line1: params.address.line1,
        line2: params.address.line2 || undefined,
        townOrCity: params.address.townOrCity,
        stateOrCounty: params.address.stateOrCounty || undefined,
        postalOrZipCode: params.address.postalOrZipCode,
        countryCode: params.address.countryCode,
      },
    },
    items: [
      {
        merchantReference: params.merchantReference,
        sku: params.sku,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: {
          color: params.color,
          size: params.size,
        },
        assets: [
          {
            printArea: "front",
            url: params.artworkUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${PRODIGI_API_BASE}/Orders`, {
    method: "POST",
    headers: {
      "X-API-Key": PRODIGI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || (json.outcome !== "Created" && json.outcome !== "Ok")) {
    throw new Error(
      `Prodigi order failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }

  return {
    outcome: json.outcome,
    orderId: json.order?.id ?? null,
    status: json.order?.status?.stage ?? null,
    raw: json,
  };
}

export async function getProdigiOrder(orderId: string) {
  if (!PRODIGI_API_KEY) {
    throw new Error("PRODIGI_API_KEY is not set");
  }
  const res = await fetch(`${PRODIGI_API_BASE}/Orders/${orderId}`, {
    headers: { "X-API-Key": PRODIGI_API_KEY },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Prodigi order lookup failed: ${JSON.stringify(json)}`);
  }
  return json;
}
