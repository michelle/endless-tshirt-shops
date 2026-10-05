import { SHIRT_CENTS } from "./colors.js";
import { createProdigiOrder } from "./prodigi.js";
import { parseSpec, signSpec } from "./spec.js";
import { getStripe } from "./stripeClient.js";

export async function fulfillPaidSession(sessionId) {
  if (!sessionId || !String(sessionId).startsWith("cs_")) {
    return { status: "error", message: "Missing checkout session." };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(String(sessionId));

  if (session.payment_status !== "paid") {
    return {
      status: "unpaid",
      message: "Payment has not completed. The shirt was not sent to print.",
    };
  }

  const raw = session.metadata?.spec;
  if (!raw) {
    return { status: "error", message: "This payment is missing its shirt specification." };
  }

  let parsed;
  try {
    parsed = parseSpec(JSON.parse(raw));
  } catch {
    return { status: "error", message: "The shirt specification could not be read." };
  }
  if (parsed.errors.length) {
    return { status: "error", message: parsed.errors[0] };
  }
  const spec = parsed.spec;

  const shipping =
    session.collected_information?.shipping_details ||
    session.shipping_details ||
    null;
  const address = shipping?.address || null;
  const name = shipping?.name || session.customer_details?.name || "";
  const email = session.customer_details?.email || shipping?.email || "";
  const phone = session.customer_details?.phone || shipping?.phone || "";

  if (!address?.line1 || !address.city || !address.postal_code || !address.country || !name) {
    return {
      status: "error",
      message: "Payment succeeded, but Stripe did not return a complete shipping address. No print order was sent.",
      sessionId: session.id,
    };
  }

  const origin = (session.metadata?.origin || "").replace(/\/$/, "");
  if (!origin.startsWith("http")) {
    return { status: "error", message: "Missing public origin for the print file." };
  }

  const token = signSpec(spec);
  const artworkUrl = `${origin}/prints/${token}.png`;
  const unit = (SHIRT_CENTS / 100).toFixed(2);

  const recipient = {
    name,
    address: {
      line1: address.line1,
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
      townOrCity: address.city,
    },
  };
  if (email) recipient.email = email;
  if (phone) recipient.phoneNumber = phone;
  if (address.line2) recipient.address.line2 = address.line2;
  if (address.state) recipient.address.stateOrCounty = address.state;

  const payload = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: "Standard",
    recipient,
    items: [
      {
        merchantReference: "meridian-tee",
        sku: "GLOBAL-TEE-BC-3001",
        copies: spec.qty,
        sizing: "fillPrintArea",
        attributes: { color: spec.color, size: spec.size },
        recipientCost: { amount: unit, currency: "USD" },
        assets: [{ printArea: "front", url: artworkUrl }],
      },
    ],
    metadata: {
      stripeSessionId: session.id,
      title: spec.title,
      place: spec.place,
    },
  };

  let data;
  try {
    data = await createProdigiOrder(payload);
  } catch (err) {
    return {
      status: "error",
      message: err.message || "Prodigi could not accept the order.",
      detail: err.detail || null,
      artworkUrl,
      sessionId: session.id,
    };
  }

  const order = data.order || null;
  const issues = order?.status?.issues || data.failures || [];
  const ok = data.outcome === "Created" || data.outcome === "AlreadyExists" || data.outcome === "created" || data.outcome === "alreadyExists";

  return {
    status: ok ? "printed" : "error",
    outcome: data.outcome || null,
    message: ok
      ? "Payment confirmed. The shirt has been sent to print."
      : "Payment succeeded, but the print order needs attention.",
    prodigiOrderId: order?.id || null,
    stage: order?.status?.stage || null,
    issues,
    artworkUrl,
    sessionId: session.id,
    summary: {
      title: spec.title,
      dedication: spec.dedication,
      place: spec.place,
      date: spec.date,
      time: spec.time,
      color: spec.color,
      size: spec.size,
      qty: spec.qty,
    },
    shipTo: {
      name,
      city: address.city,
      country: address.country,
    },
  };
}
