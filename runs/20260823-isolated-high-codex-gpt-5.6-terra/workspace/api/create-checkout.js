const {stripe, validateProduct, json} = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, {error:'Method not allowed.'});
  try {
    const {style, size, timestamp} = req.body || {};
    const safeTimestamp = validateProduct({style,size,timestamp});
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe('/checkout/sessions', {
      mode:'payment',
      success_url:`${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${origin}/?cancelled=1`,
      customer_creation:'always',
      billing_address_collection:'required',
      'shipping_address_collection[allowed_countries][0]':'US',
      'shipping_options[0][shipping_rate_data][type]':'fixed_amount',
      'shipping_options[0][shipping_rate_data][fixed_amount][amount]':'0',
      'shipping_options[0][shipping_rate_data][fixed_amount][currency]':'usd',
      'shipping_options[0][shipping_rate_data][display_name]':'Free shipping',
      'line_items[0][price_data][currency]':'usd',
      'line_items[0][price_data][product_data][name]':'Datetime shirt',
      'line_items[0][price_data][product_data][description]':`Printed with ${safeTimestamp}`,
      'line_items[0][price_data][unit_amount]':'2250',
      'line_items[0][quantity]':'1',
      'metadata[style]':style,
      'metadata[size]':size,
      'metadata[timestamp]':safeTimestamp,
    });
    return json(res, 200, {url:session.url});
  } catch (error) { return json(res, 400, {error:error.message || 'Unable to start checkout.'}); }
};
