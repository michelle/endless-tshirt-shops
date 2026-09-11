import type Stripe from "stripe";
import { stripe } from "./stripe";
import { decodeDesign } from "./design";
import { getGarment, PRODIGI_SKU } from "./catalog";
import { renderPng } from "./render";
import { createProdigiOrder, type ProdigiShippingMethod } from "./prodigi";
import { getOrder, saveOrder, storePrintFile, type OrderRecord } from "./orders";
import { siteUrl } from "./site";

/**
 * Turn a *paid* Stripe Checkout Session into a Prodigi order. Safe to call
 * more than once (webhook + success page): we short-circuit on an existing
 * record and use the session id as Prodigi's idempotency key.
 */
export async function fulfillCheckoutSession(sessionId: string): Promise<OrderRecord | null> {
  let existing = await getOrder(sessionId);
  if (existing?.status === "submitted") return existing;

  // Another worker (the webhook or the success page) is on it right now. Give
  // it up to ~20s to finish before doing the work ourselves.
  if (existing?.status === "paid" && Date.now() - Date.parse(existing.updatedAt) < 90_000) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const latest = await getOrder(sessionId);
      if (latest?.status === "submitted") return latest;
      if (latest?.status === "failed") break;
      existing = latest ?? existing;
    }
  }

  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["shipping_cost.shipping_rate", "payment_intent"],
  });
  if (session.payment_status !== "paid") return existing;

  const rec = existing ?? recordFromSession(session);
  rec.status = "paid";
  await saveOrder(rec);

  try {
    // 1. Render the print-ready file and park it somewhere Prodigi can fetch it.
    if (!rec.printUrl) {
      const png = renderPng(rec.design);
      rec.printUrl = await storePrintFile(rec.id, png);
      rec.events.push({ at: new Date().toISOString(), message: `Print file rendered (${Math.round(png.length / 1024)} KB)` });
      await saveOrder(rec);
    }

    // 2. Submit to Prodigi.
    const recipient = recipientFromSession(session);
    const garment = getGarment(rec.design.garment);
    const result = await createProdigiOrder({
      merchantReference: rec.id,
      idempotencyKey: rec.id,
      shippingMethod: rec.shippingMethod as ProdigiShippingMethod,
      recipient,
      items: [
        {
          merchantReference: `${rec.id}-front`,
          sku: PRODIGI_SKU,
          copies: rec.quantity,
          sizing: "fitPrintArea",
          attributes: { color: garment.prodigiColor, size: rec.size },
          assets: [{ printArea: "front", url: rec.printUrl }],
        },
      ],
      metadata: {
        stripeSessionId: rec.id,
        title: rec.design.title.slice(0, 100),
        place: rec.design.place.slice(0, 100),
        storefront: siteUrl(),
      },
    });

    rec.prodigiOrderId = result.order.id;
    rec.prodigiOutcome = result.outcome;
    rec.status = "submitted";
    rec.error = undefined;
    rec.events.push({ at: new Date().toISOString(), message: `Prodigi order ${result.order.id} (${result.outcome})` });
    await saveOrder(rec);

    // 3. Mirror the Prodigi id onto the PaymentIntent so it's visible in Stripe.
    if (rec.paymentIntentId) {
      await stripe().paymentIntents.update(rec.paymentIntentId, {
        metadata: { prodigi_order_id: result.order.id, prodigi_outcome: result.outcome },
      }).catch(() => undefined);
    }
    return rec;
  } catch (err) {
    rec.status = "failed";
    rec.error = err instanceof Error ? err.message : String(err);
    rec.events.push({ at: new Date().toISOString(), message: `Fulfilment failed: ${rec.error}` });
    await saveOrder(rec);
    throw err;
  }
}

function recordFromSession(session: Stripe.Checkout.Session): OrderRecord {
  const md = session.metadata ?? {};
  const designEncoded = md.design;
  if (!designEncoded) throw new Error(`Session ${session.id} has no design metadata`);
  const design = decodeDesign(designEncoded);
  const rate = session.shipping_cost?.shipping_rate;
  const shippingMethod = (typeof rate === "object" && rate?.metadata?.prodigi) || "Standard";
  const shipping = shippingDetails(session);
  const pi = session.payment_intent;
  const now = new Date().toISOString();
  return {
    id: session.id,
    createdAt: now,
    updatedAt: now,
    status: "paid",
    email: session.customer_details?.email ?? null,
    customerName: shipping?.name ?? session.customer_details?.name ?? null,
    country: shipping?.address?.country ?? null,
    design,
    designEncoded,
    size: md.size ?? "m",
    quantity: Number(md.quantity ?? "1") || 1,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    shippingMethod,
    paymentIntentId: typeof pi === "string" ? pi : pi?.id ?? null,
    events: [{ at: now, message: "Payment confirmed by Stripe" }],
  };
}

type ShippingDetails = { name?: string | null; address?: Stripe.Address | null } | null | undefined;

function shippingDetails(session: Stripe.Checkout.Session): ShippingDetails {
  // Newer API versions expose the collected address under collected_information;
  // older ones under shipping_details. Support both.
  const s = session as Stripe.Checkout.Session & {
    collected_information?: { shipping_details?: ShippingDetails } | null;
    shipping_details?: ShippingDetails;
  };
  return s.collected_information?.shipping_details ?? s.shipping_details ?? null;
}

function recipientFromSession(session: Stripe.Checkout.Session) {
  const ship = shippingDetails(session);
  const addr = ship?.address;
  if (!addr?.line1 || !addr.country || !addr.city) {
    throw new Error("Checkout session is missing a shipping address");
  }
  return {
    name: ship?.name ?? session.customer_details?.name ?? "Customer",
    email: session.customer_details?.email ?? undefined,
    phoneNumber: session.customer_details?.phone ?? undefined,
    address: {
      line1: addr.line1,
      line2: addr.line2 ?? undefined,
      postalOrZipCode: addr.postal_code ?? "",
      countryCode: addr.country,
      townOrCity: addr.city,
      stateOrCounty: addr.state ?? undefined,
    },
  };
}
