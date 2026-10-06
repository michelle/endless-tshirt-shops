// lib/prodigi.ts
// Thin client for the Prodigi Print API sandbox (api.sandbox.prodigi.com
// for testing; api.prodigi.com for production). We deliberately keep the
// surface small — just "create an order", "fetch an order", and "ensure
// we have a publicly-fetchable URL for the print asset".

const SANDBOX = "https://api.sandbox.prodigi.com/v4.0";
const PRODUCTION = "https://api.prodigi.com/v4.0";

export type ProdigiEnvironment = "sandbox" | "production";

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

export type ProdigiShippingMethod =
  | "Budget"
  | "Standard"
  | "StandardPlus"
  | "Express"
  | "Overnight";

export type ProdigiSize = "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl";
export type ProdigiColor =
  | "white"
  | "black"
  | "navy blue"
  | "natural"
  | "sand"
  | "military green";

export interface ProdigiOrderInput {
  /** Defaults to "Standard" if not supplied. */
  shippingMethod?: ProdigiShippingMethod;
  /** SKU we always use (Gildan 64000). */
  sku?: string;
  size: ProdigiSize;
  color: ProdigiColor;
  copies: number;
  /** Public URL of the print file (PNG or SVG). */
  assetUrl: string;
  /** "front" for a front-only Gildan 6400. */
  printArea?: "front" | "back";
  recipient: ProdigiRecipient;
  /** Merchant reference (for idempotency on live). */
  merchantReference?: string;
  /** Price we charged the recipient, helps couriers with customs. */
  recipientCost?: { amount: string; currency: string };
  /** Free-form metadata, ≤2 kB. */
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface ProdigiOrderResponse {
  outcome: string;
  order?: ProdigiOrderRecord;
  failures?: Record<string, unknown>;
}

export interface ProdigiOrderRecord {
  id: string;
  status: {
    stage: string;
    issues: string[];
    details: Record<string, string>;
  };
  charges: unknown[];
  shipments: unknown[];
  recipient: ProdigiRecipient;
  items: Array<{
    id: string;
    status: string;
    merchantReference?: string;
    sku: string;
    copies: number;
    sizing: string;
    attributes: Record<string, string>;
    assets: Array<{
      id?: string;
      printArea: string;
      url: string;
      status?: string;
    }>;
    recipientCost?: { amount: string; currency: string };
  }>;
  metadata?: Record<string, unknown>;
}

export class Prodigi {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  constructor(opts: { apiKey: string; environment?: ProdigiEnvironment }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.environment === "production" ? PRODUCTION : SANDBOX;
  }

  async createOrder(input: ProdigiOrderInput): Promise<ProdigiOrderResponse> {
    const payload = {
      merchantReference: input.merchantReference,
      shippingMethod: input.shippingMethod ?? "Standard",
      recipient: {
        name: input.recipient.name,
        ...(input.recipient.email ? { email: input.recipient.email } : {}),
        address: {
          line1: input.recipient.address.line1,
          ...(input.recipient.address.line2
            ? { line2: input.recipient.address.line2 }
            : {}),
          townOrCity: input.recipient.address.townOrCity,
          stateOrCounty: input.recipient.address.stateOrCounty ?? null,
          postalOrZipCode: input.recipient.address.postalOrZipCode,
          countryCode: input.recipient.address.countryCode,
        },
      },
      items: [
        {
          sku: input.sku ?? "GLOBAL-TEE-GIL-64000",
          copies: Math.max(1, input.copies),
          sizing: "fillPrintArea",
          attributes: {
            color: input.color,
            size: input.size,
          },
          ...(input.recipientCost
            ? { recipientCost: input.recipientCost }
            : {}),
          assets: [
            {
              printArea: input.printArea ?? "front",
              url: input.assetUrl,
            },
          ],
        },
      ],
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
    };

    return this.request("POST", "/Orders", payload);
  }

  async getOrder(orderId: string): Promise<ProdigiOrderResponse> {
    return this.request("GET", `/Orders/${encodeURIComponent(orderId)}`);
  }

  async cancelOrder(orderId: string): Promise<ProdigiOrderResponse> {
    return this.request(
      "POST",
      `/Orders/${encodeURIComponent(orderId)}/actions/cancel`,
      {}
    );
  }

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ProdigiOrderResponse> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: ProdigiOrderResponse;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : { outcome: "Ok" };
    } catch {
      parsed = { outcome: "Unknown", failures: { raw: text } as never };
    }
    if (!res.ok) {
      // Surface Prodigi's structured error when present.
      const message = parsed?.outcome ?? `Prodigi responded ${res.status}`;
      const err: Error & { status?: number; response?: ProdigiOrderResponse } =
        new Error(`Prodigi ${method} ${path} failed: ${message} (HTTP ${res.status})`);
      err.status = res.status;
      err.response = parsed;
      throw err;
    }
    return parsed;
  }
}
