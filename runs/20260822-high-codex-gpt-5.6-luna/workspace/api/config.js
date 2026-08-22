const { json } = require("./_lib");

module.exports = (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  return json(res, 200, {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE || "",
    amount: 2250,
    currency: "usd"
  });
};
