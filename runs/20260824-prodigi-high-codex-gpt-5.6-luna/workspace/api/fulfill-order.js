import {
  cleanString,
  jsonError,
  originFromRequest,
  PRODUCTS,
  stripeClient,
  validEmail,
  validOrderOptions,
} from './_lib.js';

function shippingPayload(input) {
  const address = input && input.address ? input.address : {};
  const country = cleanString(address.country, 2).toUpperCase() || 'US';
  return {
    name: cleanString(input?.name, 120),
    email: cleanString(input?.email, 160),
    address: {
      line1: cleanString(address.line1, 160),
      line2: cleanString(address.line2, 160) || null,
      postalOrZipCode: cleanString(address.postalCode, 24),
      countryCode: country,
      townOrCity: cleanString(address.city, 80),
      stateOrCounty: cleanString(address.state, 80) || null,
    },
  };
}

function validateShipping(recipient) {
  return recipient.name && validEmail(recipient.email) && recipient.address.line1 &&
    recipient.address.postalOrZipCode && recipient.address.townOrCity && recipient.address.countryCode;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'Method not allowed', 'method_not_allowed');
  }
  if (!process.env.PRODIGI_API_KEY) {
    return jsonError(res, 503, 'Fulfillment is not configured yet.', 'fulfillment_unavailable');
  }

  const { paymentIntentId, customer } = req.body || {};
  if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId || '')) {
    return jsonError(res, 400, 'The payment reference is invalid.');
  }
  const recipient = shippingPayload(customer);
  if (!validateShipping(recipient)) {
    return jsonError(res, 400, 'Please provide complete shipping details and a valid email.');
  }

  try {
    const stripe = stripeClient();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return jsonError(res, 402, 'Payment has not completed. Please try again.', 'payment_incomplete');
    }
    if (intent.amount !== 2250 || intent.currency !== 'usd' || intent.metadata?.product !== 'datetime-shirt') {
      return jsonError(res, 400, 'This payment does not match the item being purchased.', 'payment_mismatch');
    }
    const style = intent.metadata.style;
    const size = intent.metadata.size;
    if (!validOrderOptions(style, size)) {
      return jsonError(res, 400, 'This item configuration is no longer available.');
    }
    if (intent.metadata?.prodigi_order_id) {
      return res.status(200).json({
        orderId: intent.metadata.prodigi_order_id,
        paymentIntentId,
        timestamp: Number(intent.metadata.timestamp_ms),
        status: 'InProgress',
      });
    }

    await stripe.paymentIntents.update(paymentIntentId, {
      receipt_email: recipient.email,
      shipping: {
        name: recipient.name,
        address: {
          line1: recipient.address.line1,
          line2: recipient.address.line2 || undefined,
          city: recipient.address.townOrCity,
          state: recipient.address.stateOrCounty || undefined,
          postal_code: recipient.address.postalOrZipCode,
          country: recipient.address.countryCode,
        },
      },
    });

    const timestamp = Number(intent.metadata.timestamp_ms);
    const origin = originFromRequest(req);
    const prodigiBase = process.env.PRODIGI_ENV === 'live'
      ? 'https://api.prodigi.com'
      : 'https://api.sandbox.prodigi.com';
    const orderBody = {
      merchantReference: paymentIntentId,
      shippingMethod: 'Budget',
      idempotencyKey: paymentIntentId,
      callbackUrl: `${origin}/api/prodigi/callback`,
      recipient,
      items: [{
        merchantReference: `${paymentIntentId}-shirt`,
        sku: PRODUCTS[style].sku,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { color: 'black', size: size.toLowerCase() },
        assets: [{ printArea: 'front', url: `${origin}/api/artwork?timestamp=${timestamp}` }],
      }],
      metadata: {
        stripe_payment_intent: paymentIntentId,
        timestamp_ms: timestamp,
        shirt_style: style,
        shirt_size: size,
      },
    };
    const prodigiResponse = await fetch(`${prodigiBase}/v4.0/Orders`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PRODIGI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    });
    const prodigiPayload = await prodigiResponse.json().catch(() => ({}));
    if (!prodigiResponse.ok || prodigiPayload.outcome !== 'Created' || !prodigiPayload.order?.id) {
      console.error('Prodigi order failed', prodigiResponse.status, prodigiPayload);
      return jsonError(res, 502, 'Your payment succeeded, but the fulfillment order needs attention. Please contact support with your payment reference.', 'fulfillment_failed');
    }
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { ...intent.metadata, prodigi_order_id: prodigiPayload.order.id },
    });
    return res.status(200).json({
      orderId: prodigiPayload.order.id,
      paymentIntentId,
      timestamp,
      status: prodigiPayload.order.status?.stage || 'InProgress',
    });
  } catch (error) {
    console.error('Order fulfillment failed', error);
    return jsonError(res, 500, 'We could not complete fulfillment. Your payment is safe; please contact support with your payment reference.', 'fulfillment_failed');
  }
}
