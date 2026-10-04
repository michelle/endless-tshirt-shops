// Create a Stripe Checkout session for a customized tee.

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { BASE_PRICE_USD, BRAND, colorById, sizeById, styleById } from "@/lib/config";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { imageUrl, style, color, size, petName } = body ?? {};

  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }
  if (!style || !color || !size) {
    return NextResponse.json({ error: "style, color and size are required" }, { status: 400 });
  }

  const styleInfo = styleById(style);
  const colorInfo = colorById(color);
  const sizeInfo = sizeById(size);
  const name = typeof petName === "string" ? petName.slice(0, 40) : "";

  const origin = new URL(request.url).origin;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(BASE_PRICE_USD * 100),
            product_data: {
              name: `${BRAND} Custom Pet Portrait Tee`,
              description: `${styleInfo.label} portrait · ${colorInfo.label} · ${sizeInfo.label}${name ? ` · "${name}"` : ""}`,
            },
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "IE", "ES", "IT"],
      },
      metadata: {
        imageUrl,
        style,
        color,
        size,
        petName: name,
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout session failed:", err);
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 },
    );
  }
}
