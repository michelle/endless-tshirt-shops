'use strict';
const { validateDesign } = require('./_lib/spec');
const { sign } = require('./_lib/token');
const { originOf, parseBody } = require('./_lib/http');
const catalog = require('./_lib/catalog');
const stripe = require('./_lib/stripe');
const { fulfillPaymentIntent } = require('./_lib/fulfill');

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

    const recipient = body.recipient || {
      name: body.recipientName || 'Sandbox Evaluator',
      email: body.recipientEmail || 'evaluator@example.com',
      address: {
        line1: '350 Fifth Avenue',
        townOrCity: 'New York',
        stateOrCounty: 'NY',
        postalOrZipCode: '10118',
        countryCode: 'US',
      },
    };

    // Step 1: Execute payment with Stripe
    const pi = await stripe.createPaymentIntent({
      amount: price.total,
      currency: 'usd',
      payment_method: 'pm_card_visa',
      confirm: 'true',
      return_url: `${origin}/?sandbox_return=1`,
      metadata: {
        spec: token,
        color: color.id,
        size: size.id,
        subtotal: String(price.subtotal),
        shipping: String(price.shipping),
        recipient: JSON.stringify(recipient),
      },
    });

    // Step 2: Strictly enforce that payment succeeded before Prodigi fulfillment
    if (pi.status !== 'succeeded') {
      return res.status(402).json({
        error: 'Payment was not successful. Shirt cannot be sent to print.',
        payment_status: pi.status,
      });
    }

    // Step 3: Fulfill with Prodigi
    const fulfilled = await fulfillPaymentIntent(pi.id, origin);

    return res.status(200).json({
      success: true,
      payment_status: pi.status,
      stripePaymentIntentId: pi.id,
      ...fulfilled,
    });
  } catch (e) {
    console.error('sandbox-order error', e);
    return res.status(500).json({ error: 'Sandbox order failed', detail: e.message });
  }
};
