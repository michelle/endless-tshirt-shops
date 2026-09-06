import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSiteOrigin, SHIPPING_COUNTRIES } from "@/lib/site";
import { isColor, isSize, PRICE_CENTS, colorInfo } from "@/lib/product";

export const runtime = "nodejs";

// How far a client-reported "moment" is allowed to drift from the server's
// own clock before we assume something other than an honest button click
// produced it.
const MAX_DRIFT_MS = 2 * 60 * 1000;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { color, size, stampMs } = body ?? {};

  if (!isColor(color)) {
    return NextResponse.json({ error: "Unknown color." }, { status: 400 });
  }
  if (!isSize(size)) {
    return NextResponse.json({ error: "Unknown size." }, { status: 400 });
  }
  if (typeof stampMs !== "number" || !Number.isFinite(stampMs)) {
    return NextResponse.json(
      { error: "That doesn't look like a moment in time." },
      { status: 400 }
    );
  }
  if (Math.abs(Date.now() - stampMs) > MAX_DRIFT_MS) {
    return NextResponse.json(
      { error: "That moment has drifted too far from now. Try again." },
      { status: 400 }
    );
  }

  const origin = await getSiteOrigin();
  const stamp = Math.trunc(stampMs);
  const info = colorInfo(color);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES as any },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `datetime.store tee — ${info.label} / ${size.toUpperCase()}`,
              description: `Frozen at ${stamp} ms since epoch. This exact millisecond, screen-printed, never to occur again.`,
              images: [
                `${origin}/api/artwork/${stamp}.png?fg=${encodeURIComponent(
                  info.ink
                )}&bg=${encodeURIComponent(info.hex)}`,
              ],
            },
          },
        },
      ],
      metadata: {
        stampMs: String(stamp),
        color,
        size,
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout session error", err);
    return NextResponse.json(
      { error: err.message || "Could not start checkout." },
      { status: 500 }
    );
  }
}
