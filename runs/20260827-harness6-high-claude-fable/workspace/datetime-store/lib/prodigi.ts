import {
  GARMENT_COLOR,
  PRODIGI_SIZE,
  STYLES,
  type ShirtSize,
  type ShirtStyle,
} from "./catalog";

const PRODIGI_BASE =
  process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com";

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

export interface ProdigiOrderResult {
  outcome: string;
  order?: { id: string; status?: { stage?: string } };
  raw: unknown;
}

export async function createProdigiOrder(params: {
  idempotencyKey: string;
  merchantReference: string;
  recipient: ProdigiRecipient;
  style: ShirtStyle;
  size: ShirtSize;
  artworkUrl: string;
  timestampMs: number;
}): Promise<ProdigiOrderResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) {
    throw new Error("PRODIGI_API_KEY is not set");
  }

  const body = {
    idempotencyKey: params.idempotencyKey.slice(0, 100),
    merchantReference: params.merchantReference.slice(0, 250),
    shippingMethod: "Standard",
    recipient: params.recipient,
    items: [
      {
        merchantReference: `datetime-shirt-${params.timestampMs}`,
        sku: STYLES[params.style].prodigiSku,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: {
          color: GARMENT_COLOR,
          size: PRODIGI_SIZE[params.size],
        },
        assets: [{ printArea: "front", url: params.artworkUrl }],
      },
    ],
    metadata: {
      timestampMs: String(params.timestampMs),
      source: "datetime.store",
    },
  };

  const res = await fetch(`${PRODIGI_BASE}/v4.0/Orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as {
    outcome?: string;
    order?: { id: string; status?: { stage?: string } };
  } | null;

  if (!res.ok || !json) {
    throw new Error(
      `Prodigi order failed (HTTP ${res.status}): ${JSON.stringify(json)}`
    );
  }

  const outcome = (json.outcome ?? "").toLowerCase();
  // "created", "createdWithIssues", and "alreadyExists" all mean Prodigi has the order.
  if (!json.order || !outcome.startsWith("created") && outcome !== "alreadyexists") {
    throw new Error(`Prodigi order not created: ${JSON.stringify(json)}`);
  }

  return { outcome: json.outcome ?? "", order: json.order, raw: json };
}

export async function getProdigiOrder(id: string): Promise<unknown> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not set");
  const res = await fetch(`${PRODIGI_BASE}/v4.0/Orders/${id}`, {
    headers: { "X-API-Key": apiKey },
  });
  return res.json();
}
