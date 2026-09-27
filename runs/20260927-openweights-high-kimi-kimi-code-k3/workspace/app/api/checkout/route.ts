import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { validateDesign, PRICE_CENTS, COLORS } from "@/lib/design";
import { signDesign } from "@/lib/tokens";
import { requestOrigin } from "@/lib/fulfill";

export const dynamic = "force-dynamic";

/**
 * Creates a payment session. Uses Stripe Checkout when STRIPE_SECRET_KEY is
 * configured; otherwise falls back to the built-in demo payment gateway so
 * the store remains testable end-to-end in sandbox environments.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const design = validateDesign(body);
  if (typeof design === "string")
    return NextResponse.json({ error: design }, { status: 400 });

  const token = signDesign(design);
  const origin = requestOrigin(req);
  const colorLabel =
    COLORS.find((c) => c.value === design.color)?.label ?? design.color;

  if (process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `StarMark Night Sky Tee — ${colorLabel}, ${design.size.toUpperCase()}`,
              description: `Custom star map: "${design.caption}" · ${design.date} · ${design.place}`,
              images: [`${origin}/api/preview?token=${encodeURIComponent(token)}`],
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [
          "US", "GB", "CA", "AU", "NZ", "IE", "DE", "FR", "NL", "ES", "IT",
        ],
      },
      metadata: { artToken: token },
      success_url: `${origin}/success?ref={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
    });
    return NextResponse.json({ url: session.url, provider: "stripe" });
  }

  return NextResponse.json({
    url: `/demo-checkout?d=${encodeURIComponent(token)}`,
    provider: "demo",
  });
}
