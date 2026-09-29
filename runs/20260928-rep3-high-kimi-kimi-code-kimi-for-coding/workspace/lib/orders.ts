// Order pipeline: Stripe PaymentIntent creation + Prodigi fulfilment.
// Shared by /api/checkout, the Stripe webhook, and the reconcile endpoint.

import Stripe from "stripe";
import { validateDesign, PRICE_CENTS, type DesignInput } from "./design-input";
import { signDesign, verifyDesign } from "./token";
import { createProdigiOrder, findOrderByReference, type ProdigiRecipient } from "./prodigi";

export const SHIRT_SKU = "GLOBAL-TEE-BC-3001";

export function stripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2025-02-24.acacia" as any });
}

export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function publishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? "";
}

export function printUrlForToken(token: string): string {
  return `${siteUrl()}/api/print/${token}.png`;
}

export function previewUrlFor(d: DesignInput): string {
  const q = new URLSearchParams({
    label: d.label, lat: String(d.lat), lon: String(d.lon), ms: String(d.ms),
    tz: d.tz, color: d.color, size: d.size,
  });
  if (d.caption) q.set("caption", d.caption);
  return `${siteUrl()}/api/preview?${q.toString()}`;
}

export async function createPayment(raw: unknown): Promise<
  { clientSecret: string; piId: string; publishableKey: string } | { error: string }
> {
  const v = validateDesign(raw);
  if (!v.ok) return { error: v.error };
  const d = v.value;
  const token = signDesign(d);
  const pi = await stripe().paymentIntents.create({
    amount: PRICE_CENTS,
    currency: "usd",
    payment_method_types: ["card"],
    description: `Meridian Sky Tee — ${d.label} (${d.size}/${d.color})`,
    metadata: {
      token,
      label: d.label,
      size: d.size,
      color: d.color,
    },
  });
  if (!pi.client_secret) return { error: "Could not create payment intent." };
  return { clientSecret: pi.client_secret, piId: pi.id, publishableKey: publishableKey() };
}

/**
 * Submit a paid order to Prodigi. Idempotent: keyed by the Stripe PaymentIntent
 * id both via merchantReference pre-check and Prodigi's idempotencyKey, so
 * webhook retries and the reconcile endpoint never double-submit.
 */
export async function fulfillOrder(piId: string): Promise<{ ok: boolean; detail: string; prodigiId?: string }> {
  const pi = await stripe().paymentIntents.retrieve(piId);
  if (pi.status !== "succeeded") {
    return { ok: false, detail: `PaymentIntent ${piId} is not paid (status: ${pi.status}).` };
  }
  const token = pi.metadata?.token ?? "";
  const design = verifyDesign(token);
  if (!design) return { ok: false, detail: "Design token missing or invalid." };

  const existing = await findOrderByReference(piId);
  if (existing) {
    return { ok: true, detail: "already-fulfilled", prodigiId: existing.id };
  }

  const ship = pi.shipping;
  if (!ship?.name || !ship.address?.line1 || !ship.address.city || !ship.address.postal_code || !ship.address.country) {
    return { ok: false, detail: "Shipping address incomplete." };
  }
  const recipient: ProdigiRecipient = {
    name: ship.name,
    email: pi.receipt_email ?? null,
    phoneNumber: (ship.phone ?? null) as string | null,
    address: {
      line1: ship.address.line1,
      line2: ship.address.line2 ?? null,
      townOrCity: ship.address.city,
      stateOrCounty: ship.address.state ?? null,
      postalOrZipCode: ship.address.postal_code,
      countryCode: ship.address.country,
    },
  };

  const result = await createProdigiOrder({
    idempotencyKey: piId,
    merchantReference: piId,
    recipient,
    item: {
      sku: SHIRT_SKU,
      copies: 1,
      color: design.color,
      size: design.size,
      assetUrl: printUrlForToken(token),
      recipientCost: { amount: (PRICE_CENTS / 100).toFixed(2), currency: "USD" },
    },
  });

  const warn = (result.issues ?? []).map((i) => i.errorCode).join(",");
  return { ok: true, detail: warn ? `created (${warn})` : "created", prodigiId: result.id };
}

export async function orderStatus(piId: string) {
  const pi = await stripe().paymentIntents.retrieve(piId);
  let prodigi: any = null;
  try {
    prodigi = await findOrderByReference(piId);
  } catch {
    /* prodigi lookup is best-effort */
  }
  const shipments: any[] = prodigi?.shipments ?? [];
  return {
    paid: pi.status === "succeeded",
    paymentStatus: pi.status,
    amountTotal: pi.amount_received,
    currency: pi.currency,
    customerEmail: pi.receipt_email ?? null,
    prodigi: prodigi
      ? {
          id: prodigi.id,
          stage: prodigi.status?.stage ?? null,
          shipmentStatus: shipments.map((s: any) => s.status),
          tracking: shipments.map((s: any) => s.tracking).filter(Boolean),
        }
      : null,
  };
}
