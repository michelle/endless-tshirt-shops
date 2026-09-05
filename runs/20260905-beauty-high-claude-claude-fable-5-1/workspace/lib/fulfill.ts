import type Stripe from "stripe";
import { stripe, sessionShipping } from "./stripe";
import { createOrder, findOrderByMerchantReference, ProdigiError, type ProdigiOrder } from "./prodigi";
import { COLOR_INFO, STYLE_INFO, isColor, isSize, isStyle, prodigiSize } from "./catalog";
import { artUrl, siteUrl } from "./site";
import { parseTs } from "./time";

export interface FulfillmentResult {
  state: "created" | "exists" | "unpaid" | "skipped";
  order?: ProdigiOrder;
  reason?: string;
}

/**
 * Turn a paid Stripe Checkout Session into exactly one Prodigi order.
 *
 * Idempotent three ways:
 *  1. we look up Prodigi by merchantReference (= the session id) first,
 *  2. we send Prodigi an idempotencyKey (= the session id),
 *  3. callers (webhook + thank-you page) can both call this safely.
 */
export async function ensureFulfilled(sessionOrId: string | Stripe.Checkout.Session): Promise<FulfillmentResult> {
  const session =
    typeof sessionOrId === "string"
      ? await stripe().checkout.sessions.retrieve(sessionOrId, { expand: ["customer_details"] })
      : sessionOrId;

  if (session.payment_status !== "paid") {
    return { state: "unpaid", reason: `payment_status=${session.payment_status}` };
  }

  const existing = await findOrderByMerchantReference(session.id);
  if (existing) return { state: "exists", order: existing };

  const meta = session.metadata || {};
  const ts = parseTs(meta.ts);
  const style = isStyle(meta.style) ? meta.style : "unisex";
  const color = isColor(meta.color) ? meta.color : "black";
  const size = isSize(meta.size) ? meta.size : "M";
  if (!ts) return { state: "skipped", reason: "session has no valid moment in metadata" };

  const shipping = sessionShipping(session);
  const addr = shipping?.address;
  if (!addr || !addr.line1 || !addr.country || !addr.city || !addr.postal_code) {
    return { state: "skipped", reason: "session has no complete shipping address" };
  }

  const base = siteUrl();
  const input = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: "Standard" as const,
    callbackUrl: `${base}/api/prodigi/callback`,
    recipient: {
      name: shipping?.name || session.customer_details?.name || "Time Traveller",
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        townOrCity: addr.city,
        stateOrCounty: addr.state || undefined,
        postalOrZipCode: addr.postal_code,
        countryCode: addr.country,
      },
    },
    items: [
      {
        merchantReference: `moment-${ts}`,
        sku: STYLE_INFO[style].sku,
        copies: 1,
        sizing: "fillPrintArea" as const,
        attributes: { color, size: prodigiSize(size) },
        assets: [{ printArea: "front", url: artUrl(base, ts, COLOR_INFO[color].ink) }],
      },
    ],
    metadata: {
      ts,
      style,
      color,
      size,
      stripeSessionId: session.id,
      stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "",
    },
  };

  try {
    const { order } = await createOrder(input);
    return { state: "created", order };
  } catch (err) {
    // A race between the webhook and the thank-you page can land here; re-check.
    if (err instanceof ProdigiError && (err.status === 409 || err.status === 400)) {
      const again = await findOrderByMerchantReference(session.id);
      if (again) return { state: "exists", order: again };
    }
    throw err;
  }
}
