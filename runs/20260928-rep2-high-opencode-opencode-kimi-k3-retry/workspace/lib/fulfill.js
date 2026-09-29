import { getStripe } from "./stripe.js";
import { findOrderByMerchantReference, createOrder, getOrder } from "./prodigi.js";
import { signArtParams } from "./sign.js";

export const SKU = "GLOBAL-TEE-BC-3001"; // Bella+Canvas 3001, DTG

// Fulfill a paid Stripe Checkout session with Prodigi.
// Safe to call multiple times: checks merchantReference and uses an idempotency key.
export async function fulfillSession(sessionId, baseUrl) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session || session.id !== sessionId) {
    return { fulfilled: false, reason: "session_not_found" };
  }
  if (session.payment_status !== "paid") {
    return { fulfilled: false, reason: "unpaid", paymentStatus: session.payment_status };
  }

  const md = session.metadata || {};
  const { word, palette, color, size, qty, edition } = md;
  if (!word || !palette || !color || !size) {
    return { fulfilled: false, reason: "missing_metadata", metadata: md };
  }

  const existing = await findOrderByMerchantReference(session.id);
  if (existing) {
    return { fulfilled: true, existing: true, order: existing, edition };
  }

  const ship =
    session.shipping_details || session.collected_information?.shipping_details || {};
  const addr = ship.address || session.customer_details?.address || {};
  const recipient = {
    name: ship.name || session.customer_details?.name || "ONE OF ONE customer",
    email: session.customer_details?.email || session.customer_email || undefined,
    phoneNumber: session.customer_details?.phone || undefined,
    address: {
      line1: addr.line1 || "—",
      line2: addr.line2 || undefined,
      postalOrZipCode: addr.postal_code || "—",
      countryCode: addr.country || "US",
      townOrCity: addr.city || "—",
      stateOrCounty: addr.state || undefined,
    },
  };

  const signed = signArtParams({ w: word, p: palette, c: color, s: size });
  const artUrl = `${baseUrl}/api/art?${signed}`;

  const quantity = Math.max(1, Math.min(5, parseInt(qty || "1", 10) || 1));
  const unitPrice = ((session.amount_total || 3600) / 100 / quantity).toFixed(2);

  const payload = {
    merchantReference: session.id,
    shippingMethod: "Standard",
    recipient,
    items: [
      {
        merchantReference: `${session.id}:1`,
        sku: SKU,
        copies: quantity,
        sizing: "fillPrintArea",
        attributes: { color: color.toLowerCase(), size: size.toLowerCase() },
        recipientCost: { amount: unitPrice, currency: (session.currency || "usd").toUpperCase() },
        assets: [{ printArea: "front", url: artUrl }],
      },
    ],
    metadata: {
      source: "oneofone-studio",
      word,
      palette,
      edition: edition || "",
      stripeSession: session.id,
    },
  };

  const res = await createOrder(payload, session.id);
  if (res.outcome === "Created" || res.outcome === "AlreadyExists" || res.outcome === "OnHold" || res.outcome === "CreatedWithIssues") {
    return { fulfilled: true, existing: res.outcome === "AlreadyExists", order: res.order, edition, outcome: res.outcome };
  }
  return { fulfilled: false, reason: "prodigi_rejected", prodigi: res };
}

export async function orderStatus(sessionId) {
  const stripe = getStripe();
  let session = null;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return null;
  }
  const po = await findOrderByMerchantReference(session.id);
  return {
    paid: session.payment_status === "paid",
    amountTotal: session.amount_total,
    currency: session.currency,
    email: session.customer_details?.email || session.customer_email || null,
    metadata: session.metadata || {},
    prodigi: po
      ? {
          id: po.id,
          stage: po.status?.stage,
          details: po.status?.details,
          issues: po.status?.issues,
          shipments: (po.shipments || []).map((s) => ({
            status: s.status,
            carrier: s.carrier?.name,
            tracking: s.tracking || null,
            dispatchDate: s.dispatchDate || null,
          })),
          created: po.created,
        }
      : null,
  };
}
