const { stripeClient, json, parseBody, origin, getArtworkBuffer, createDesign, PRODUCTS, SIZES } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  try {
    const body = await parseBody(req);
    const { style, size, artwork } = body;
    if (!Object.prototype.hasOwnProperty.call(PRODUCTS, style) || !Object.prototype.hasOwnProperty.call(SIZES, size)) {
      return json(res, 400, { error: "Choose a valid fit and size." });
    }
    const art = getArtworkBuffer(artwork);
    const designId = process.env.APP_DRY_RUN === "true" ? `dry_design_${Date.now()}` : await createDesign(art);
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: 2250,
          product_data: {
            name: "Datetime tee",
            description: `${style === "fitted" ? "Fitted" : "Unisex"} / size ${size} / printed with your exact moment`
          }
        },
        quantity: 1
      }],
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "ES", "IE"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "Free shipping", delivery_estimate: { minimum: { unit: "business_day", value: 7 }, maximum: { unit: "business_day", value: 14 } } } }],
      customer_creation: "always",
      submit_type: "pay",
      metadata: { design_id: designId, style, size, fulfillment_status: "awaiting_payment" },
      success_url: `${origin(req)}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin(req)}/?canceled=1`
    });
    return json(res, 200, { id: session.id, url: session.url });
  } catch (error) {
    console.error("checkout_session_error", error);
    return json(res, error.status && error.status < 500 ? error.status : 502, { error: error.message || "Unable to start checkout." });
  }
};
