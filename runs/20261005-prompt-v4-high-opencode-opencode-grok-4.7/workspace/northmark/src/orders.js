import Stripe from "stripe";
import { createOrder, findByMerchantReference, getOrder } from "./prodigi.js";
import { SKU, sizeById } from "./catalog.js";
import { specFromMetadata } from "./validate.js";

let stripe;
function client() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      const err = new Error("Payments are not configured.");
      err.status = 500;
      throw err;
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

const inflight = new Map();

export function fulfill(sessionId) {
  if (!sessionId || !/^cs_/.test(sessionId)) {
    const err = new Error("Missing checkout session.");
    err.status = 400;
    throw err;
  }
  if (inflight.has(sessionId)) return inflight.get(sessionId);
  const job = fulfillInner(sessionId).finally(() => inflight.delete(sessionId));
  inflight.set(sessionId, job);
  return job;
}

async function fulfillInner(sessionId) {
  const session = await client().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
  if (session.payment_status !== "paid") {
    return {
      paid: false,
      paymentStatus: session.payment_status,
      status: session.status,
      prodigiOrderId: null,
    };
  }
  const paymentIntent = session.payment_intent;
  const existingId = paymentIntent?.metadata?.prodigiOrderId;
  if (existingId) {
    return present(session, existingId, paymentIntent.metadata.prodigiStatus || "");
  }

  const prior = await findByMerchantReference(session.id).catch(() => null);
  if (prior?.id) {
    await remember(paymentIntent, prior);
    return present(session, prior.id, prior.status?.stage || "");
  }

  const spec = specFromMetadata(session.metadata || {});
  const origin = session.metadata.origin;
  const artUrl = `${origin}/art/${session.id}.png`;
  const size = sizeById(spec.size);
  const copies = spec.copies;
  const payload = {
    merchantReference: session.id,
    idempotencyKey: `northmark-${session.id}`,
    shippingMethod: spec.method || "Standard",
    recipient: {
      name: spec.shipName,
      email: spec.email,
      phoneNumber: spec.phone,
      address: {
        line1: spec.line1,
        line2: spec.line2 || null,
        postalOrZipCode: spec.postal,
        countryCode: spec.country,
        townOrCity: spec.city,
        stateOrCounty: spec.region || null,
      },
    },
    items: [
      {
        merchantReference: session.id,
        sku: SKU,
        copies,
        sizing: "fillPrintArea",
        attributes: { color: spec.color, size: spec.size },
        recipientCost: {
          amount: ((session.amount_total || 0) / 100).toFixed(2),
          currency: (session.currency || "usd").toUpperCase(),
        },
        assets: [{ printArea: "front", url: artUrl }],
      },
    ],
    metadata: {
      stripeSessionId: session.id,
      specimen: spec.title,
    },
  };

  const created = await createOrder(payload);
  const order = created.order;
  if (!order?.id) {
    const err = new Error(created.outcome || "The print order was not accepted.");
    err.status = 502;
    err.detail = created;
    throw err;
  }
  await remember(paymentIntent, order);
  return present(session, order.id, order.status?.stage || "", created.outcome, size);
}

async function remember(paymentIntent, order) {
  if (!paymentIntent?.id) return;
  try {
    await client().paymentIntents.update(paymentIntent.id, {
      metadata: {
        prodigiOrderId: order.id,
        prodigiStatus: order.status?.stage || "",
      },
    });
  } catch (error) {
    console.error("Could not store print id on the payment", error.message);
  }
}

function present(session, prodigiOrderId, stage) {
  return {
    paid: true,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    prodigiOrderId,
    prodigiStage: stage || null,
    metadata: publicMeta(session.metadata || {}),
  };
}

function publicMeta(metadata) {
  return {
    title: metadata.title || "",
    place: metadata.place || "",
    date: metadata.date || "",
    time: metadata.time || "",
    color: metadata.color || "",
    size: metadata.size || "",
    copies: metadata.copies || "1",
    dedication: metadata.dedication || "",
  };
}

export async function orderStatus(sessionId) {
  const summary = await fulfill(sessionId);
  if (!summary.prodigiOrderId) return summary;
  try {
    const remote = await getOrder(summary.prodigiOrderId);
    const order = remote.order || remote;
    return {
      ...summary,
      prodigiStage: order.status?.stage || summary.prodigiStage,
      prodigiIssues: order.status?.issues || [],
      shipments: (order.shipments || []).map((shipment) => ({
        status: shipment.status,
        carrier: shipment.carrier?.name || null,
        tracking: shipment.tracking || null,
      })),
    };
  } catch (error) {
    return { ...summary, statusError: error.message };
  }
}

export async function createCheckout({ spec, origin }) {
  const size = sizeById(spec.size);
  const shirtCents = size.price;
  const shippingCents = spec.shippingCents;
  const metadata = {
    origin,
    title: spec.title,
    place: spec.place,
    dedication: spec.dedication || "",
    date: spec.date,
    time: spec.time,
    timezone: spec.timezone,
    lat: String(spec.lat),
    lon: String(spec.lon),
    color: spec.color,
    size: spec.size,
    copies: String(spec.copies),
    method: spec.method,
    shipName: spec.shipName,
    email: spec.email,
    phone: spec.phone,
    line1: spec.line1,
    line2: spec.line2 || "",
    city: spec.city,
    region: spec.region || "",
    postal: spec.postal,
    country: spec.country,
    shippingCents: String(shippingCents),
  };
  for (const [k, v] of Object.entries(metadata)) {
    if (String(v).length > 500) {
      const err = new Error(`${k} is too long to store with the payment.`);
      err.status = 400;
      throw err;
    }
  }
  const session = await client().checkout.sessions.create({
    mode: "payment",
    success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
    customer_email: spec.email,
    billing_address_collection: "auto",
    line_items: [
      {
        quantity: spec.copies,
        price_data: {
          currency: "usd",
          unit_amount: shirtCents,
          product_data: {
            name: `Northmark plate — ${spec.title}`,
            description: `${size.name} · ${spec.color} · ${spec.place} · ${spec.date}`,
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shippingCents,
          product_data: {
            name: `Standard shipping to ${spec.country}`,
            description: "Printed and shipped after payment",
          },
        },
      },
    ],
    metadata,
    payment_intent_data: {
      metadata: {
        title: spec.title,
        place: spec.place,
        country: spec.country,
      },
    },
  });
  return { url: session.url, id: session.id };
}

export function stripeClient() {
  return client();
}
