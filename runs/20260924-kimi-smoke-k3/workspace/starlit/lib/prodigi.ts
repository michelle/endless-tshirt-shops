// Minimal Prodigi Print API v4 client (sandbox or live, chosen by env).

import type { OrderConfig, ShippingAddress } from "./order";
import { SHIRT_SKU } from "./order";

function baseUrl(): string {
  return (
    process.env.PRODIGI_BASE_URL ?? "https://api.sandbox.prodigi.com/v4.0"
  ).replace(/\/$/, "");
}

function apiKey(): string {
  const k = process.env.PRODIGI_API_KEY;
  if (!k) throw new Error("PRODIGI_API_KEY is not set");
  return k;
}

export interface ProdigiOrderResult {
  id: string;
  status: string;
  raw: unknown;
}

export async function prodigiFetch(
  path: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Prodigi ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `Prodigi ${path} → HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
  return json;
}

// Submit one personalized shirt. Called ONLY after payment succeeds.
export async function createShirtOrder(
  cfg: OrderConfig,
  ship: ShippingAddress,
  designUrl: string
): Promise<ProdigiOrderResult> {
  const payload = {
    merchantReference: cfg.ref,
    shippingMethod: "Standard",
    idempotencyKey: cfg.ref,
    recipient: {
      name: ship.name,
      email: ship.email,
      address: {
        line1: ship.line1,
        ...(ship.line2 ? { line2: ship.line2 } : {}),
        postalOrZipCode: ship.zip,
        countryCode: ship.country.toUpperCase(),
        townOrCity: ship.city,
        ...(ship.state ? { stateOrCounty: ship.state } : {}),
      },
    },
    items: [
      {
        sku: SHIRT_SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: { color: cfg.color, size: cfg.size },
        assets: [{ printArea: "front", url: designUrl }],
      },
    ],
    metadata: { source: "starlit-storefront" },
  };
  const json = await prodigiFetch("/Orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const order = (json.order ?? {}) as Record<string, unknown>;
  const status = (order.status ?? {}) as Record<string, unknown>;
  return {
    id: String(order.id ?? ""),
    status: String(status.stage ?? "Unknown"),
    raw: json,
  };
}

export async function getOrder(id: string): Promise<Record<string, unknown>> {
  return prodigiFetch(`/Orders/${encodeURIComponent(id)}`);
}
