import { artworkPath, originForRequest, parseItems, PRICE_CENTS, PRODUCT_SKU, stripeRequest } from '../lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const items = parseItems(payload.items);
    const origin = originForRequest(req);
    const sessionParams = {
      mode: 'payment',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': PRICE_CENTS,
      'line_items[0][price_data][product_data][name]': 'Signal Bloom one-of-one tee',
      'line_items[0][price_data][product_data][description]': `${items[0].design.phrase} · custom DTG print`,
      'line_items[0][quantity]': items[0].quantity,
      'shipping_address_collection[allowed_countries][0]': 'US',
      'shipping_address_collection[allowed_countries][1]': 'CA',
      'shipping_address_collection[allowed_countries][2]': 'GB',
      'shipping_address_collection[allowed_countries][3]': 'AU',
      'shipping_address_collection[allowed_countries][4]': 'NZ',
      'shipping_address_collection[allowed_countries][5]': 'IE',
      'shipping_address_collection[allowed_countries][6]': 'DE',
      'shipping_address_collection[allowed_countries][7]': 'FR',
      'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
      'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '600',
      'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd',
      'shipping_options[0][shipping_rate_data][display_name]': 'Tracked standard shipping',
      'shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]': 'business_day',
      'shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]': '5',
      'shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]': 'business_day',
      'shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]': '10',
      'success_url': `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${origin}/?canceled=1`,
      'customer_creation': 'always',
      'billing_address_collection': 'auto',
      'submit_type': 'pay',
    };

    // Keep fulfillment data in Stripe metadata: the webhook is the source of truth after payment.
    items.forEach((item, index) => {
      if (index > 0) {
        sessionParams[`line_items[${index}][price_data][currency]`] = 'usd';
        sessionParams[`line_items[${index}][price_data][unit_amount]`] = PRICE_CENTS;
        sessionParams[`line_items[${index}][price_data][product_data][name]`] = 'Signal Bloom one-of-one tee';
        sessionParams[`line_items[${index}][price_data][product_data][description]`] = `${item.design.phrase} · custom DTG print`;
        sessionParams[`line_items[${index}][quantity]`] = item.quantity;
      }
      sessionParams[`metadata[design_${index}]`] = JSON.stringify({ ...item.design, quantity: item.quantity, sku: PRODUCT_SKU, artwork: `${origin}${artworkPath(item.design)}` });
    });
    sessionParams['metadata[item_count]'] = items.length;

    const session = await stripeRequest('checkout/sessions', sessionParams);
    return res.status(200).json({ url: session.url, id: session.id });
  } catch (error) {
    console.error('[create-checkout]', error);
    return res.status(error.message.includes('not configured') ? 503 : 400).json({ error: error.message });
  }
}
