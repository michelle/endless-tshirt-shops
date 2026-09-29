import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { BASE_PRICE_USD, SHIPPING_USD, SITE_NAME } from "@/lib/config";
import type { DesignParams } from "@/lib/design";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: DesignParams;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { date, lat, lng, title, locationName, color, size } = body;

  // Basic validation.
  if (!date || !title || !locationName || !color || !size) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;

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
              name: "Custom Star Map Tee",
              description: `${title} — ${locationName}`,
            },
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(SHIPPING_USD * 100),
            product_data: { name: "Shipping" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        date,
        lat: String(lat),
        lng: String(lng),
        title,
        locationName,
        color,
        size,
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "IE", "ES", "IT", "SE", "NO", "DK", "FI", "PT", "AT", "BE", "CH", "PL", "CZ"],
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session creation failed", err);
    return NextResponse.json(
      { error: "Could not start checkout" },
      { status: 500 }
    );
  }
}
