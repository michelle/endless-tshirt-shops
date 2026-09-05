/**
 * Fulfillment: turn a paid Stripe PaymentIntent into a Prodigi order, exactly once.
 *
 * Stripe is the system of record (no database). The PaymentIntent carries the design
 * (style/size/timestamp) in metadata, the shipping address, and, once fulfilled, the
 * Prodigi order id. Idempotency is guaranteed twice over: we only submit when no
 * prodigi_order_id is present, and we send the PaymentIntent id as Prodigi's
 * idempotencyKey so a concurrent webhook + client call can't create two orders.
 */
import type Stripe from "stripe";
import { stripe } from "./stripe";
import * as prodigi from "./prodigi";
import { publicBaseUrl } from "./env";
import {
  COLOR,
  CURRENCY,
  PRICE_CENTS,
  PRODIGI_SHIPPING_METHOD,
  SHIP_COUNTRIES,
  STYLES,
  designKey,
  isSizeFor,
  isStyle,
  type StyleId,
} from "./products";

export interface OrderView {
  id: string;
  paymentStatus: Stripe.PaymentIntent.Status;
  paid: boolean;
  amount: number;
  currency: string;
  email: string | null;
  style: StyleId | null;
  size: string | null;
  timestamp: number | null;
  sku: string | null;
  artworkUrl: string | null;
  shipping: { name: string | null; city: string | null; state: string | null; country: string | null } | null;
  fulfillment: {
    provider: "prodigi";
    orderId: string | null;
    stage: string | null;
    status: string | null;
    error: string | null;
    sandbox: boolean;
  };
  createdAt: number;
}

export function artworkUrl(style: StyleId, timestamp: number): string {
  return `${publicBaseUrl()}/api/artwork/${designKey({ style, timestamp })}.png`;
}

export async function retrieveIntent(id: string): Promise<Stripe.PaymentIntent | null> {
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) return null;
  try {
    return await stripe().paymentIntents.retrieve(id);
  } catch (err) {
    const e = err as { code?: string; statusCode?: number };
    if (e.code === "resource_missing" || e.statusCode === 404) return null;
    throw err;
  }
}

function designFromIntent(pi: Stripe.PaymentIntent): { style: StyleId; size: string; timestamp: number } | null {
  const { style, size, timestamp } = pi.metadata ?? {};
  const ts = Number(timestamp);
  if (!isStyle(style) || !isSizeFor(style, size) || !Number.isInteger(ts)) return null;
  return { style, size, timestamp: ts };
}

/** pi.shipping is set by Stripe.js at confirmation; metadata.ship is the server-validated copy taken at checkout. */
export function shippingFromIntent(pi: Stripe.PaymentIntent): Stripe.PaymentIntent.Shipping | null {
  if (pi.shipping?.address?.line1) return pi.shipping;
  const raw = pi.metadata?.ship;
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { n?: string; p?: string; l1?: string; l2?: string; c?: string; s?: string; z?: string; co?: string };
    return {
      name: s.n ?? null,
      phone: s.p ?? null,
      carrier: null,
      tracking_number: null,
      address: { line1: s.l1 ?? null, line2: s.l2 ?? null, city: s.c ?? null, state: s.s ?? null, postal_code: s.z ?? null, country: s.co ?? null },
    } as Stripe.PaymentIntent.Shipping;
  } catch {
    return null;
  }
}

export function toOrderView(pi: Stripe.PaymentIntent): OrderView {
  const design = designFromIntent(pi);
  const md = pi.metadata ?? {};
  const ship = shippingFromIntent(pi);
  return {
    id: pi.id,
    paymentStatus: pi.status,
    paid: pi.status === "succeeded",
    amount: pi.amount,
    currency: pi.currency,
    email: pi.receipt_email ?? null,
    style: design?.style ?? null,
    size: design?.size ?? null,
    timestamp: design?.timestamp ?? null,
    sku: design ? STYLES[design.style].sku : null,
    artworkUrl: design ? artworkUrl(design.style, design.timestamp) : null,
    shipping: ship
      ? {
          name: ship.name ?? null,
          city: ship.address?.city ?? null,
          state: ship.address?.state ?? null,
          country: ship.address?.country ?? null,
        }
      : null,
    fulfillment: {
      provider: "prodigi",
      orderId: md.prodigi_order_id || null,
      stage: md.prodigi_stage || null,
      status: md.prodigi_status || null,
      error: md.prodigi_error || null,
      sandbox: prodigi.prodigiIsSandbox(),
    },
    createdAt: pi.created * 1000,
  };
}

/**
 * Submit the Prodigi order for a paid PaymentIntent if it hasn't been submitted yet.
 * Returns the (possibly refreshed) PaymentIntent. Never throws for Prodigi failures;
 * the failure is recorded in metadata.prodigi_error so it's visible and retryable.
 */
export async function ensureFulfilled(pi: Stripe.PaymentIntent): Promise<Stripe.PaymentIntent> {
  if (pi.status !== "succeeded") return pi;
  if (pi.metadata?.prodigi_order_id) return pi;

  const design = designFromIntent(pi);
  if (!design) {
    return recordError(pi, "PaymentIntent is missing a valid design (style/size/timestamp)");
  }
  const ship = shippingFromIntent(pi);
  if (!ship?.address?.line1 || !ship.address.city || !ship.address.postal_code || !ship.address.country) {
    return recordError(pi, "PaymentIntent is missing a complete shipping address");
  }
  if (!SHIP_COUNTRIES.includes(ship.address.country.toUpperCase())) {
    return recordError(pi, `Shipping country ${ship.address.country} is not enabled (SHIP_COUNTRIES=${SHIP_COUNTRIES.join(",")})`);
  }

  const styleDef = STYLES[design.style];
  const request: prodigi.ProdigiCreateOrderRequest = {
    merchantReference: pi.id,
    idempotencyKey: pi.id,
    shippingMethod: PRODIGI_SHIPPING_METHOD,
    callbackUrl: callbackUrl(),
    // Prodigi rejects empty strings for optional fields, so omit anything blank.
    recipient: {
      name: nonBlank(ship.name) ?? "Customer",
      email: nonBlank(pi.receipt_email),
      phoneNumber: nonBlank(ship.phone),
      address: {
        line1: ship.address.line1,
        line2: nonBlank(ship.address.line2),
        townOrCity: ship.address.city,
        stateOrCounty: nonBlank(ship.address.state),
        postalOrZipCode: ship.address.postal_code,
        countryCode: ship.address.country.toUpperCase(),
      },
    },
    items: [
      {
        merchantReference: designKey(design),
        sku: styleDef.sku,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: COLOR, size: design.size.toLowerCase() },
        recipientCost: { amount: (pi.amount / 100).toFixed(2), currency: pi.currency.toUpperCase() },
        assets: [{ printArea: "front", url: artworkUrl(design.style, design.timestamp) }],
      },
    ],
    metadata: {
      stripePaymentIntent: pi.id,
      style: design.style,
      size: design.size,
      timestamp: String(design.timestamp),
      store: "datetime.store",
    },
  };

  try {
    const res = await prodigi.createOrder(request);
    const order = res.order;
    const issues = order.status?.issues ?? [];
    console.info("[prodigi] order", res.outcome, order.id, "for", pi.id, issues.length ? JSON.stringify(issues) : "");
    return await stripe().paymentIntents.update(pi.id, {
      metadata: {
        prodigi_order_id: order.id,
        prodigi_outcome: res.outcome,
        prodigi_stage: order.status?.stage ?? "",
        prodigi_status: summarizeStatus(order),
        prodigi_error: issues.length ? issues.map((i) => `${i.errorCode}: ${i.description}`).join("; ").slice(0, 490) : "",
        prodigi_env: prodigi.prodigiIsSandbox() ? "sandbox" : "live",
      },
    });
  } catch (err) {
    const message = err instanceof prodigi.ProdigiError ? `${err.message}: ${JSON.stringify(err.body)}` : String(err);
    console.error("[prodigi] order failed for", pi.id, message);
    return recordError(pi, message);
  }
}

/** Refresh prodigi_stage/status metadata from Prodigi (used by the order page and callbacks). */
export async function refreshFulfillment(pi: Stripe.PaymentIntent): Promise<Stripe.PaymentIntent> {
  const id = pi.metadata?.prodigi_order_id;
  if (!id) return pi;
  try {
    const { order } = await prodigi.getOrder(id);
    const stage = order.status?.stage ?? "";
    const status = summarizeStatus(order);
    if (stage === pi.metadata.prodigi_stage && status === pi.metadata.prodigi_status) return pi;
    return await stripe().paymentIntents.update(pi.id, { metadata: { prodigi_stage: stage, prodigi_status: status } });
  } catch (err) {
    console.warn("[prodigi] refresh failed for", id, String(err));
    return pi;
  }
}

export function summarizeStatus(order: prodigi.ProdigiOrder): string {
  const d = order.status?.details ?? {};
  const shipment = order.shipments?.[0];
  if (shipment?.tracking?.number) return `Shipped · ${shipment.carrier?.name ?? "carrier"} ${shipment.tracking.number}`;
  if (order.status?.stage === "Complete") return "Shipped";
  if (order.status?.stage === "Cancelled") return "Cancelled";
  if (d.shipping === "InProgress") return "Shipping";
  if (d.inProduction === "InProgress" || d.inProduction === "Complete") return "In production";
  if (d.printReadyAssetsPrepared === "Complete") return "Print-ready";
  if (d.downloadAssets === "Error") return "Asset download error";
  if (d.downloadAssets === "InProgress" || d.downloadAssets === "NotStarted") return "Received";
  return order.status?.stage ?? "Unknown";
}

function callbackUrl(): string | undefined {
  const base = publicBaseUrl();
  if (base.startsWith("http://localhost")) return undefined;
  const token = process.env.PRODIGI_CALLBACK_TOKEN;
  return `${base}/api/prodigi/callback${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

function nonBlank(v: string | null | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

async function recordError(pi: Stripe.PaymentIntent, message: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe().paymentIntents.update(pi.id, { metadata: { prodigi_error: message.slice(0, 490) } });
  } catch {
    return pi;
  }
}

/** Build the PaymentIntent for a checkout. Amount is authoritative here, never from the client. */
export function intentParams(input: {
  style: StyleId;
  size: string;
  timestamp: number;
  email: string;
  shipping: Stripe.PaymentIntentCreateParams.Shipping;
}): Stripe.PaymentIntentCreateParams {
  return {
    amount: PRICE_CENTS,
    currency: CURRENCY,
    automatic_payment_methods: { enabled: true },
    receipt_email: input.email,
    description: `datetime.store tee — ${input.timestamp} (${STYLES[input.style].label} ${input.size})`,
    statement_descriptor_suffix: "DATETIME",
    metadata: {
      store: "datetime.store",
      style: input.style,
      size: input.size,
      timestamp: String(input.timestamp),
      sku: STYLES[input.style].sku,
      color: COLOR,
      artwork_url: artworkUrl(input.style, input.timestamp),
      ship: JSON.stringify({
        n: input.shipping.name,
        p: input.shipping.phone ?? undefined,
        l1: input.shipping.address.line1,
        l2: input.shipping.address.line2 ?? undefined,
        c: input.shipping.address.city,
        s: input.shipping.address.state ?? undefined,
        z: input.shipping.address.postal_code,
        co: input.shipping.address.country,
      }).slice(0, 500),
    },
  };
}
