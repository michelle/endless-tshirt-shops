'use strict';
const { validateDesign, COUNTRIES } = require('./_lib/spec');
const { sign } = require('./_lib/token');
const { originOf, parseBody } = require('./_lib/http');
const catalog = require('./_lib/catalog');
const stripe = require('./_lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = parseBody(req);
    const v = validateDesign(body);
    if (!v.ok) return res.status(400).json({ error: v.errors.join(' '), errors: v.errors });

    const { spec, color, size } = v;
    const price = catalog.priceFor(size.id);
    const token = sign(spec);
    const origin = originOf(req);

    const session = await stripe.createCheckoutSession({
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      customer_creation: 'always',
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: COUNTRIES },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: price.subtotal,
            product_data: {
              name: 'Personalised Star Map Tee',
              description: `${color.name} · ${size.name} · ${spec.c}`,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: price.shipping,
            product_data: { name: 'Standard shipping' },
          },
        },
      ],
      metadata: {
        spec: token,
        sku: catalog.PRODUCT.sku,
        color: color.id,
        size: size.id,
        subtotal: String(price.subtotal),
        shipping: String(price.shipping),
      },
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (e) {
    console.error('checkout error', e);
    return res.status(500).json({ error: 'Could not start checkout.', detail: e.message });
  }
};
