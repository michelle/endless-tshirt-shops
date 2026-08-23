const { stripeClient, json, validOptions, siteUrl } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const { style, size, designId } = req.body || {};
    if (!validOptions(style, size) || typeof designId !== 'string' || !/^[A-Za-z0-9_-]{3,100}$/.test(designId)) return json(res, 400, { error: 'Your shirt configuration expired. Please try again.' });
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: 'usd', unit_amount: 2250, product_data: { name: 'datetime.store timestamp tee', description: `${style === 'fitted' ? 'Fitted' : 'Unisex'} · size ${size}` } }, quantity: 1 }],
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      customer_creation: 'always',
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      allow_promotion_codes: false,
      metadata: { style, size, design_id: designId, fulfillment_status: 'pending' },
      success_url: `${siteUrl(req)}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl(req)}/`,
    });
    return json(res, 200, { url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[create-checkout-session]', error);
    return json(res, 500, { error: error.message || 'Checkout is temporarily unavailable.' });
  }
};
