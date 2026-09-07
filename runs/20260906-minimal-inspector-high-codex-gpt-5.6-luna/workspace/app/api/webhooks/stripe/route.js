import { getStripe } from '../../../../lib/stripe';
import { fulfillPaymentIntent } from '../../../../lib/fulfillment';

export async function POST(request) {
  const stripe = getStripe();
  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Webhook secret is not configured.' }, { status: 503 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return Response.json({ error: `Invalid webhook signature: ${error.message}` }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    try {
      await fulfillPaymentIntent(event.data.object);
    } catch (error) {
      console.error('stripe webhook fulfillment', error);
      return Response.json({ error: 'Fulfillment failed; Stripe will retry this event.' }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
