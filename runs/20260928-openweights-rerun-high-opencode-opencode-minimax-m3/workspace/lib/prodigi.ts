// Prodigi API helpers.
//
// The production shape is:
//   1. POST /v4.0/orders with the recipient, the SKU + attributes, and one
//      `assets` entry that points at a publicly accessible URL.
//   2. The asset URL must be reachable by Prodigi's labs. We point it at
//      our own /api/asset route so the PNG is generated on demand with no
//      blob storage or external CDN in the loop.

import type { Design } from "./design";
import { PRODIGI_SKU } from "./design";
import { requiredEnv } from "./env";

const PRODIGI_BASE =
  process.env.PRODIGI_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0";

interface ProdigiAddress {
  line1: string;
  line2?: string | null;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
}

interface ProdigiRecipient {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  address: ProdigiAddress;
}

export interface CreateOrderInput {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "StandardPlus" | "Express" | "Overnight";
  recipient: ProdigiRecipient;
  assetUrl: string;
  design: Design;
}

export interface ProdigiOrderResponse {
  outcome: string;
  order?: {
    id: string;
    status?: { stage?: string; issues?: unknown[] };
    shipments?: unknown[];
    [k: string]: unknown;
  };
  issues?: { errorCode?: string; description?: string }[];
}

async function prodigiCall<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const key = requiredEnv("PRODIGI_API_KEY");
  const resp = await fetch(`${PRODIGI_BASE}${path}`, {
    method: init.method,
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  let parsed: T;
  try {
    parsed = (await resp.json()) as T;
  } catch {
    throw new Error(
      `Prodigi ${path} returned a non-JSON response (HTTP ${resp.status})`,
    );
  }

  if (!resp.ok) {
    const message =
      (parsed as { issues?: { description?: string }[] })?.issues
        ?.map((i) => i.description)
        .join("; ") || `HTTP ${resp.status}`;
    throw new Error(`Prodigi ${path} failed: ${message}`);
  }

  return parsed;
}

export function createProdigiOrder(input: CreateOrderInput) {
  return prodigiCall<ProdigiOrderResponse>("/Orders", {
    method: "POST",
    body: {
      merchantReference: input.merchantReference,
      shippingMethod: input.shippingMethod,
      recipient: {
        name: input.recipient.name,
        email: input.recipient.email ?? undefined,
        phoneNumber: input.recipient.phoneNumber ?? undefined,
        address: {
          line1: input.recipient.address.line1,
          line2: input.recipient.address.line2 ?? undefined,
          postalOrZipCode: input.recipient.address.postalOrZipCode,
          countryCode: input.recipient.address.countryCode,
          townOrCity: input.recipient.address.townOrCity,
          stateOrCounty: input.recipient.address.stateOrCounty ?? undefined,
        },
      },
      items: [
        {
          merchantReference: `${input.merchantReference}-item`,
          sku: PRODIGI_SKU,
          copies: 1,
          sizing: "fillPrintArea",
          attributes: {
            color: input.design.shirt.color,
            size: input.design.shirt.size,
          },
          recipientCost: {
            amount: "0.00",
            currency: "USD",
          },
          assets: [
            {
              printArea: "front",
              url: input.assetUrl,
            },
          ],
        },
      ],
      metadata: {
        source: "starmaptee.store",
        designDate: input.design.date,
        designLat: input.design.lat.toFixed(2),
        designLon: input.design.lon.toFixed(2),
        designTitle: input.design.title,
      },
    },
  });
}

export function getProdigiOrder(prodigiOrderId: string) {
  return prodigiCall<ProdigiOrderResponse>(`/Orders/${encodeURIComponent(prodigiOrderId)}`, {
    method: "GET",
  });
}
