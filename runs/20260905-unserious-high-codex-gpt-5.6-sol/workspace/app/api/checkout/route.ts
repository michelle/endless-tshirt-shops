import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  fit: z.enum(['unisex', 'fitted']),
  size: z.enum(['S', 'M', 'L', 'XL']),
  timestamp: z.number().int().min(1_600_000_000_000).max(9_999_999_999_999),
});

const allowedCountries = ['US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'DK', 'FI', 'NO', 'SE', 'CH', 'PT', 'PL'] as const;

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const origin = new URL(request.url).origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled#top`,
      customer_creation: 'always',
      billing_address_collection: 'auto',
      shipping_address_collection: { allowed_countries: [...allowedCountries] },
      phone_number_collection: { enabled: true },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Suspiciously free shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 4 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
      ],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 2250,
            product_data: {
              name: `datetime.store shirt — ${input.timestamp}`,
              description: `Black ${input.fit} t-shirt, size ${input.size}. Already out of date.`,
              metadata: { timestamp: String(input.timestamp), fit: input.fit, size: input.size },
            },
          },
        },
      ],
      metadata: { timestamp: String(input.timestamp), fit: input.fit, size: input.size, fulfillment: 'prodigi-sandbox' },
      payment_intent_data: { description: `datetime.store shirt — ${input.timestamp}`, metadata: { timestamp: String(input.timestamp), fit: input.fit, size: input.size } },
      submit_type: 'pay',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Pick a real fit, size, and moment.' : 'Checkout is temporarily unstuck from time.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
