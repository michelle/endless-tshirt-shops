const { stripeClient, json, fulfillSession } = require("./_lib");

function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const handler = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  try {
    const signature = req.headers["stripe-signature"];
    if (!process.env.STRIPE_WEBHOOK_SECRET) return json(res, 503, { error: "Webhook signing secret is not configured." });
    const event = stripeClient().webhooks.constructEvent(await rawBody(req), signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") await fulfillSession(event.data.object);
    return json(res, 200, { received: true });
  } catch (error) {
    console.error("webhook_error", error);
    return json(res, 400, { error: "Invalid webhook." });
  }
};

handler.config = { api: { bodyParser: false } };
module.exports = handler;
