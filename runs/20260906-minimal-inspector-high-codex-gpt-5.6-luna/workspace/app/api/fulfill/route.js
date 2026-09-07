import { fulfillPaymentIntent } from '../../../lib/fulfillment';

export async function POST(request) {
  try {
    const { paymentIntentId } = await request.json();
    if (!paymentIntentId || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return Response.json({ error: 'A valid payment intent is required.' }, { status: 400 });
    }

    const result = await fulfillPaymentIntent(paymentIntentId);
    return Response.json(result);
  } catch (error) {
    console.error('fulfill', error);
    const message = error.message?.startsWith('Payment is not complete')
      ? error.message
      : 'Payment succeeded, but fulfillment is still being prepared. Please contact support if this persists.';
    return Response.json({ error: message }, { status: 502 });
  }
}
