import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getShirt, SIZES } from "@/lib/shirts";
import { getBaseUrl } from "@/lib/base-url";
import { ALLOWED_SHIPPING_COUNTRIES } from "@/lib/checkout-countries";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug = body?.slug as string | undefined;
  const size = body?.size as string | undefined;

  if (!slug || !size) {
    return NextResponse.json({ error: "Missing slug or size" }, { status: 400 });
  }

  const shirt = getShirt(slug);
  if (!shirt) {
    return NextResponse.json({ error: "Unknown product" }, { status: 404 });
  }
  if (!SIZES.includes(size as (typeof SIZES)[number])) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shirt.priceCents,
          product_data: {
            name: `HTTP ${shirt.code} ${shirt.title} Tee — Size ${size}`,
            description: shirt.flavor,
            images: [`${baseUrl}/mockups/${shirt.slug}.png`],
            metadata: { slug: shirt.slug, size },
          },
        },
      },
    ],
    shipping_address_collection: {
      allowed_countries: ALLOWED_SHIPPING_COUNTRIES as unknown as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
    },
    phone_number_collection: { enabled: true },
    metadata: { slug: shirt.slug, size, quantity: "1" },
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/product/${shirt.slug}`,
  });

  return NextResponse.json({ url: session.url });
}
