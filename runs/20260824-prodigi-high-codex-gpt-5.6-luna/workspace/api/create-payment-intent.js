import { jsonError, PRICE_CENTS, stripeClient, validOrderOptions } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'Method not allowed', 'method_not_allowed');
  }
  const { style, size, timestamp, email } = req.body || {};
  if (!validOrderOptions(style, size)) {
    return jsonError(res, 400, 'Choose a valid cut and size.');
  }
  const emailValue = typeof email === 'string' ? email.trim().slice(0, 160) : '';
  if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
    return jsonError(res, 400, 'Enter a valid email address.');
  }
  const time = Number(timestamp);
  if (!Number.isFinite(time) || time < 0) {
    return jsonError(res, 400, 'The timestamp on the order is invalid.');
  }

  try {
    const stripe = stripeClient();
    const intent = await stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: 'usd',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      receipt_email: emailValue || undefined,
      description: `datetime.store ${style} ${size} shirt`,
      metadata: {
        product: 'datetime-shirt',
        style,
        size,
        timestamp_ms: String(Math.round(time)),
      },
    });
    return res.status(200).json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (error) {
    console.error('Payment intent creation failed', error);
    return jsonError(res, 500, 'Payments are temporarily unavailable. Please try again.', 'payment_unavailable');
  }
}
