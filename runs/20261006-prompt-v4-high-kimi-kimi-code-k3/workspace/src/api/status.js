const { stripeApi } = require("../../lib/stripe");
const { fulfillSession } = require("../../lib/fulfill");
const prodigi = require("../../lib/prodigi");
const { sendJson } = require("../../lib/http");

// GET /api/status?session_id=cs_test_...
// Returns payment + fulfillment state. If paid but not yet fulfilled
// (e.g. webhook hasn't arrived), fulfills inline as a fallback.
module.exports = async (req, res) => {
  if (req.method !== "GET") return sendJson(res, 405, { error: "method not allowed" });
  const sessionId = (req.query && req.query.session_id) || "";
  if (!/^cs_(test|live)_/.test(sessionId)) return sendJson(res, 400, { error: "bad session id" });

  let session;
  try {
    session = await stripeApi("GET", "/v1/checkout/sessions/" + encodeURIComponent(sessionId));
  } catch (e) {
    return sendJson(res, 404, { error: "session not found" });
  }

  let fulfillment = null;
  if (session.payment_status === "paid") {
    try {
      fulfillment = await fulfillSession(session);
    } catch (e) {
      fulfillment = { fulfilled: false, error: e.message };
    }
  }

  let prodigiStatus = null;
  const orderId = fulfillment && fulfillment.prodigiOrderId;
  if (orderId) {
    try {
      const o = await prodigi.getOrder(orderId);
      prodigiStatus = o && o.order && o.order.status && o.order.status.stage;
    } catch (e) {
      prodigiStatus = "unknown";
    }
  }

  const md = session.metadata || {};
  let design = null;
  try { design = md.design ? JSON.parse(md.design) : null; } catch (e) {}

  return sendJson(res, 200, {
    paymentStatus: session.payment_status,
    fulfillment,
    prodigiOrderId: orderId || null,
    prodigiStatus,
    design: design ? { title: design.title, place: design.place, iso: design.iso } : null,
  });
};
