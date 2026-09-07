import { checkoutSchema, validateMoment, PRICE, CATALOG } from '@/lib/catalog';
import {
  checkOrigin,
  readJson,
  appUrl,
  assertPaymentMode,
  required,
} from '@/lib/config';
import { stripe } from '@/lib/stripe';
import { quote } from '@/lib/prodigi';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
  } catch {
    return Response.json(
      { error: 'This request is not allowed.' },
      { status: 403 },
    );
  }
  let input;
  try {
    input = checkoutSchema.parse(await readJson(request));
    validateMoment(input.timestamp);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error && e.message.includes('device clock')
            ? e.message
            : 'Please select a valid fit and size, then try again.',
      },
      { status: 400 },
    );
  }
  try {
    assertPaymentMode(required('STRIPE_SECRET_KEY').includes('_live_'));
    await quote(input);
    const session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        billing_address_collection: 'auto',
        shipping_address_collection: { allowed_countries: ['US'] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: { amount: 0, currency: 'usd' },
              display_name: 'Free US standard shipping',
            },
          },
        ],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: PRICE,
              product_data: {
                name: 'The datetime tee',
                description: `${CATALOG[input.fit].name} / ${input.size} / Black — ${input.timestamp}`,
                images: [`${appUrl()}/shirt.webp`],
              },
            },
          },
        ],
        metadata: {
          product: 'datetime-v1',
          fit: input.fit,
          size: input.size,
          timestamp: String(input.timestamp),
        },
        payment_intent_data: {
          metadata: {
            product: 'datetime-v1',
            fit: input.fit,
            size: input.size,
            timestamp: String(input.timestamp),
          },
        },
        success_url: `${appUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/?cancelled=1`,
        custom_text: {
          submit: {
            message:
              'Test store: no real charge or shipment. Your timestamp is already captured.',
          },
        },
      },
      { idempotencyKey: `datetime-${input.requestId}` },
    );
    return Response.json(
      { url: session.url },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    console.error('checkout_failed', {
      message: e instanceof Error ? e.message : 'unknown',
    });
    return Response.json(
      {
        error:
          'Checkout is temporarily unavailable. Your card has not been charged. Please try again shortly.',
      },
      { status: 503 },
    );
  }
}
