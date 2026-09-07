import { NextResponse } from "next/server";
import { z } from "zod";
import { fits, PRICE_CENTS, PRODUCT_NAME, sizes } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  fit: z.enum(Object.keys(fits) as [keyof typeof fits, ...(keyof typeof fits)[]]),
  size: z.enum(sizes),
  timestamp: z.number().int().safe().positive(),
});

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Expected a JSON request." }, { status: 415 });
    }

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Choose a valid fit and size." }, { status: 400 });

    const { fit, size, timestamp } = parsed.data;
    const now = Date.now();
    if (timestamp < now - 10 * 60_000 || timestamp > now + 60_000) {
      return NextResponse.json({ error: "That moment expired. Please try again." }, { status: 400 });
    }

    const origin = siteUrl(request.url);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: `datetime-${timestamp}`,
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: PRODUCT_NAME,
              description: `${fits[fit].label} · ${size} · ${timestamp}`,
              metadata: { fit, size, timestamp: String(timestamp) },
            },
          },
        },
      ],
      metadata: { fit, size, timestamp: String(timestamp) },
      payment_intent_data: {
        description: `datetime.store — ${timestamp}`,
        metadata: { fit, size, timestamp: String(timestamp) },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session error", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
