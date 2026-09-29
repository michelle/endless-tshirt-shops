// 4000 Fridays — fulfilment orchestration (server only).
//
// The rule: a shirt is sent to Prodigi ONLY after Stripe confirms payment.
// Two idempotent triggers call the same `fulfillStripeSession`:
//   1. the /success page (server-verified Checkout Session retrieval), and
//   2. the /api/stripe-webhook `checkout.session.completed` handler.
// Re-runs are safe: the Prodigi order uses idempotencyKey = stripe session id,
// so duplicates return `alreadyExists` with the original order.

import type Stripe from "stripe";
import {
  CURRENCY,
  PRODIGI_SHIPPING_METHOD,
  PRODIGI_SKU,
  SHIRT_PRICE_CENTS,
  SHIPPING_PRICE_CENTS,
  getShirt,
} from "./config";
import { DesignParams, decodeDesign, encodeDesign, renderDesignSVG } from "./design";
import { ProdigiOrder, createProdigiOrder } from "./prodigi";
import { renderPrintPNG } from "./render";
import { b64urlEncode, md5, sign } from "./sign";

export interface FulfillResult {
  ok: boolean;
  status:
    | "fulfilled"
    | "already-fulfilled"
    | "unpaid"
    | "invalid-design"
    | "error";
  orderId?: string;
  orderStage?: string;
  error?: string;
}

function siteBaseUrl(): string {
  const base = process.env.SITE_BASE_URL;
  if (base) return base.replace(/\/$/, "");
  throw new Error("SITE_BASE_URL is not set");
}

export function designFromSession(session: Stripe.Checkout.Session): DesignParams | null {
  const raw = session.metadata?.design;
  if (!raw) return null;
  let compact: unknown;
  try {
    compact = JSON.parse(raw);
  } catch {
    return null;
  }
  return decodeDesign(compact);
}

export function printFileUrl(design: DesignParams): string {
  const payload = b64urlEncode(JSON.stringify(encodeDesign(design)));
  return `${siteBaseUrl()}/api/print-file?d=${payload}&s=${sign(payload)}`;
}

/** Verifies payment, then places the print order. Never throws. */
export async function fulfillStripeSession(
  session: Stripe.Checkout.Session
): Promise<FulfillResult> {
  try {
    if (session.payment_status !== "paid") {
      return { ok: false, status: "unpaid" };
    }

    const design = designFromSession(session);
    if (!design) {
      return { ok: false, status: "invalid-design", error: "no valid design on session" };
    }

    // Build the signed print URL + integrity hash from the exact bytes the
    // /api/print-file endpoint will serve to Prodigi (timeline is frozen via
    // design.asof, so bytes are stable).
    const png = renderPrintPNG(design);
    const artworkMd5 = md5(png);
    const artworkUrl = printFileUrl(design);

    const shirt = getShirt(design.shirt);
    if (!shirt) return { ok: false, status: "invalid-design", error: "unknown shirt" };

    const totalRetail = (
      SHIRT_PRICE_CENTS * design.qty +
      SHIPPING_PRICE_CENTS
    ) / 100;

    const shipping =
      session.collected_information?.shipping_details ??
      (session as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } })
        .shipping_details; // older API versions place it top-level
    const address = shipping?.address;
    const email = session.customer_details?.email ?? undefined;
    const phone =
      session.customer_details?.phone ?? undefined;

    if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) {
      return { ok: false, status: "error", error: "missing shipping address on session" };
    }

    const res = await createProdigiOrder({
      shippingMethod: PRODIGI_SHIPPING_METHOD,
      idempotencyKey: `stripe-${session.id}`,
      merchantReference: session.id,
      recipient: {
        name: shipping.name,
        email,
        phoneNumber: phone ?? undefined,
        address: {
          line1: address.line1,
          line2: address.line2 ?? undefined,
          townOrCity: address.city,
          stateOrCounty: address.state ?? undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
        },
      },
      items: [
        {
          sku: PRODIGI_SKU,
          copies: design.qty,
          sizing: "fillPrintArea",
          attributes: { color: shirt.prodigiColor, size: design.size },
          recipientCost: { amount: totalRetail.toFixed(2), currency: CURRENCY.toUpperCase() },
          assets: [
            {
              printArea: "front",
              url: artworkUrl,
              md5Hash: artworkMd5,
            },
          ],
          merchantReference: session.id,
        },
      ],
      metadata: {
        store: "4000-fridays",
        stripeSessionId: session.id,
        design: JSON.stringify(encodeDesign(design)),
      },
    });

    const order: ProdigiOrder = res.order;
    const stage: string | undefined = order.status?.stage;
    const outcome = String(res.outcome || "").toLowerCase();

    if (outcome === "alreadyexists") {
      // A race between /success and the webhook — the shirt is already ordered.
      return { ok: true, status: "already-fulfilled", orderId: order.id, orderStage: stage };
    }
    if (outcome === "created" || outcome === "onhold" || outcome === "createdwithissues") {
      return { ok: true, status: "fulfilled", orderId: order.id, orderStage: stage };
    }
    return { ok: false, status: "error", error: `unexpected Prodigi outcome: ${res.outcome}` };
  } catch (err) {
    return {
      ok: false,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Re-export for the success page preview.
export { renderDesignSVG };
