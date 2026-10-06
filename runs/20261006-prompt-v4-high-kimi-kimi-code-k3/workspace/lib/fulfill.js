const env = require("./env");
const { stripeApi } = require("./stripe");
const prodigi = require("./prodigi");
const { encodeDesign } = require("./sign");

function publicUrl() {
  return (env.get("PUBLIC_URL") || "http://localhost:3177").replace(/\/$/, "");
}

function artUrlFor(design, sig) {
  return publicUrl() + "/api/art?d=" + encodeDesign(design) + "&sig=" + encodeURIComponent(sig);
}

/**
 * Fulfill a paid Stripe checkout session: send the shirt order to Prodigi.
 * Idempotent via Stripe session metadata (prodigi_order_id).
 */
async function fulfillSession(session) {
  const md = session.metadata || {};
  if (session.payment_status !== "paid") {
    return { fulfilled: false, reason: "payment_status=" + session.payment_status };
  }
  if (md.prodigi_order_id) {
    return { fulfilled: true, already: true, prodigiOrderId: md.prodigi_order_id };
  }
  if (!md.design || !md.sig) {
    return { fulfilled: false, reason: "session missing design metadata" };
  }

  let design;
  try {
    design = JSON.parse(md.design);
  } catch (e) {
    return { fulfilled: false, reason: "bad design metadata" };
  }

  const imageUrl = artUrlFor(design, md.sig);
  const recipient = prodigi.recipientFromSession(session);
  const result = await prodigi.createShirtOrder({
    merchantReference: session.id,
    recipient,
    sku: md.sku,
    size: md.size,
    color: md.color,
    imageUrl,
  });

  const orderId = result && result.order && result.order.id;
  if (orderId) {
    try {
      await stripeApi("POST", "/v1/checkout/sessions/" + session.id, {
        metadata: { prodigi_order_id: orderId },
      });
    } catch (e) {
      // non-fatal: order exists, we just couldn't record it back
      console.error("could not record prodigi order id on session:", e.message);
    }
  }
  return { fulfilled: true, already: false, prodigiOrderId: orderId, prodigiOutcome: result && result.outcome };
}

module.exports = { fulfillSession, artUrlFor, publicUrl };
