import { orderSchema, PRICE, SHIPPING } from '@/lib/design';
import {
  APP,
  json,
  origin,
  requireCheckoutConfig,
  sign,
  stripe,
} from '@/lib/server';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  let data;
  try {
    if (Number(req.headers.get('content-length') || 0) > 8192)
      return json({ error: 'Request too large.' }, 413);
    const body = await req.text();
    if (body.length > 8192) return json({ error: 'Request too large.' }, 413);
    data = orderSchema.parse(JSON.parse(body));
  } catch {
    return json(
      { error: 'Please check your design, size, quantity and approval.' },
      400,
    );
  }
  try {
    requireCheckoutConfig();
  } catch {
    return json(
      {
        error:
          'Checkout is not available yet. The store owner needs to connect the Stripe payment account.',
      },
      503,
    );
  }
  if (req.headers.get('origin') !== origin())
    return json({ error: 'Invalid request origin.' }, 403);
  try {
    const token = sign({ orderId: data.requestId });
    const session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        shipping_address_collection: { allowed_countries: ['US'] },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: PRICE,
              product_data: {
                name: 'AFTER HOURS — Personal Tour Tee',
                description: `${data.design.headline} · Black / ${data.size.toUpperCase()} · Personalized front print`,
              },
            },
            quantity: data.quantity,
          },
        ],
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: 'Standard US shipping',
              type: 'fixed_amount',
              fixed_amount: { amount: SHIPPING, currency: 'usd' },
            },
          },
        ],
        automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === 'true' },
        metadata: { app: APP, order: JSON.stringify(data), access: token },
        payment_intent_data: {
          metadata: { app: APP, orderId: data.requestId },
        },
        success_url: `${origin()}/order?session_id={CHECKOUT_SESSION_ID}&token=${encodeURIComponent(token)}`,
        cancel_url: `${origin()}/?canceled=1`,
        custom_text: {
          submit: {
            message:
              'Your personalized shirt goes to print after payment. Please verify your shipping address.',
          },
        },
      },
      { idempotencyKey: `${APP}:${data.requestId}` },
    );
    if (session.status !== 'open')
      return json(
        {
          error:
            'This checkout has already been completed or expired. Change your design or quantity to start a new order.',
        },
        409,
      );
    return json({ url: session.url });
  } catch (e) {
    console.error('checkout_failed', { type: (e as Error).name });
    return json(
      {
        error:
          'Could not open checkout. Please try again. If your previous checkout expired, change quantity and try again.',
      },
      502,
    );
  }
}
