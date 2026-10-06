const crypto = require("crypto");
const env = require("../../lib/env");
const { fulfillSession } = require("../../lib/fulfill");
const { readRawBody, sendJson } = require("../../lib/http");

function verifyStripeSignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const parts = {};
  for (const kv of String(header).split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts[kv.slice(0, i)] = kv.slice(i + 1);
  }
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac("sha256", secret).update(parts.t + "." + rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  // tolerance: 5 minutes
  return Math.abs(Date.now() / 1000 - Number(parts.t)) < 300;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method not allowed" });
  const secret = env.get("STRIPE_WEBHOOK_SECRET");
  const raw = (await readRawBody(req)).toString("utf8");

  if (!verifyStripeSignature(raw, req.headers["stripe-signature"], secret)) {
    return sendJson(res, 400, { error: "invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch (e) {
    return sendJson(res, 400, { error: "invalid payload" });
  }

  if (event.type === "checkout.session.completed") {
    try {
      const result = await fulfillSession(event.data.object);
      console.log("fulfillment:", JSON.stringify(result));
      if (!result.fulfilled && result.reason !== "payment_status=unpaid") {
        return sendJson(res, 500, { error: "fulfillment failed", detail: result });
      }
      return sendJson(res, 200, { received: true, result });
    } catch (e) {
      console.error("fulfillment error:", e.message);
      return sendJson(res, 500, { error: e.message });
    }
  }

  return sendJson(res, 200, { received: true, ignored: event.type });
};

module.exports.config = { api: { bodyParser: false } };
