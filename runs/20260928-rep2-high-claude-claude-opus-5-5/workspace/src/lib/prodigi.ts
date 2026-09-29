import "server-only";
import { env } from "./env";

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

export type ProdigiOrderInput = {
  merchantReference: string;
  idempotencyKey: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: ProdigiRecipient;
  items: {
    merchantReference?: string;
    sku: string;
    copies: number;
    sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
    attributes: Record<string, string>;
    assets: { printArea: string; url: string }[];
  }[];
  metadata?: Record<string, string>;
};

export type ProdigiOrder = {
  id: string;
  created: string;
  status: { stage: string; issues: { errorCode: string; description: string }[]; details: Record<string, string> };
  shipments: { id: string; status: string; carrier?: { name: string; service: string }; tracking?: { number: string; url: string } }[];
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${env.prodigiApiUrl()}${path}`, {
    method,
    headers: { "X-API-Key": env.prodigiApiKey(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Prodigi ${method} ${path} failed (${res.status}): ${JSON.stringify(json).slice(0, 800)}`);
  }
  return json as T;
}

/** Creates an order. Safe to retry: Prodigi returns outcome "AlreadyExists" for a repeated idempotencyKey. */
export async function createOrder(input: ProdigiOrderInput) {
  return call<{ outcome: string; order: ProdigiOrder }>("POST", "/orders", input);
}

export async function getOrder(id: string) {
  return call<{ outcome: string; order: ProdigiOrder }>("GET", `/orders/${encodeURIComponent(id)}`);
}
