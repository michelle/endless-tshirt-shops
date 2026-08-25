// Minimal client for the Prodigi Print API (v4.0), used to fulfill orders
// once Stripe confirms payment. Docs: https://www.prodigi.com/print-api/docs/reference/

export type ProdigiAddress = {
  line1: string;
  line2?: string | null;
  townOrCity: string;
  postalOrZipCode: string;
  countryCode: string;
  stateOrCounty?: string | null;
};

export type CreateProdigiOrderInput = {
  merchantReference: string;
  idempotencyKey: string;
  recipientName: string;
  recipientEmail?: string;
  address: ProdigiAddress;
  sku: string;
  color: string;
  size: string;
  artworkUrl: string;
};

export type ProdigiOrderResult = {
  outcome: string;
  orderId: string | null;
  status: string | null;
  raw: unknown;
};

function prodigiBaseUrl(): string {
  // The sandbox environment mirrors the production API 1:1 but never ships
  // real product or charges a real print run — exactly what we want here.
  return process.env.PRODIGI_ENVIRONMENT === "live"
    ? "https://api.prodigi.com/v4.0"
    : "https://api.sandbox.prodigi.com/v4.0";
}

export async function createProdigiOrder(
  input: CreateProdigiOrderInput,
): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new Error("PRODIGI_API_KEY is not set");
  }

  const body = {
    merchantReference: input.merchantReference,
    shippingMethod: "Standard",
    idempotencyKey: input.idempotencyKey,
    recipient: {
      name: input.recipientName,
      email: input.recipientEmail,
      address: {
        line1: input.address.line1,
        line2: input.address.line2 || undefined,
        townOrCity: input.address.townOrCity,
        postalOrZipCode: input.address.postalOrZipCode,
        countryCode: input.address.countryCode,
        stateOrCounty: input.address.stateOrCounty || undefined,
      },
    },
    items: [
      {
        merchantReference: input.merchantReference,
        sku: input.sku,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: {
          color: input.color,
          size: input.size,
        },
        assets: [
          {
            printArea: "front",
            url: input.artworkUrl,
          },
        ],
      },
    ],
    metadata: {
      source: "datetime.store",
    },
  };

  const res = await fetch(`${prodigiBaseUrl()}/Orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `Prodigi order creation failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }

  return {
    outcome: json.outcome,
    orderId: json.order?.id ?? null,
    status: json.order?.status?.stage ?? null,
    raw: json,
  };
}
