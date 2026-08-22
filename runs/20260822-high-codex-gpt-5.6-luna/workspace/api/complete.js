const { stripeClient, json, fulfillSession } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  try {
    const sessionId = req.query && req.query.session_id;
    if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json(res, 400, { error: "A valid checkout session is required." });
    const session = await stripeClient().checkout.sessions.retrieve(sessionId);
    const result = await fulfillSession(session);
    return json(res, 200, { status: "fulfilled", ...result });
  } catch (error) {
    console.error("fulfillment_error", error);
    return json(res, error.message === "Payment has not completed." ? 409 : 502, { error: error.message || "Unable to complete fulfillment." });
  }
};
