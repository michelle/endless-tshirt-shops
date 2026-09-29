import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { BASE_PRICE_USD, validateCustomization } from "@/lib/config";
import { getBaseUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const err = validateCustomization(body);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const quantity = body.quantity ?? 1;

  const metadata: Record<string, string> = {
    date: body.date,
    time: body.time || "",
    lat: String(body.lat),
    lng: String(body.lng),
    title: body.title,
    names: body.names,
    message: body.message || "",
    locationLabel: body.locationLabel,
    shirtColor: body.shirtColor,
    size: body.size,
    quantity: String(quantity),
  };

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(BASE_PRICE_USD * 100),
            product_data: {
              name: "Custom Star Map T-Shirt",
              description: `${body.title} — ${body.names} (${body.shirtColor}, ${body.size})`,
            },
          },
        },
      ],
      metadata,
      shipping_address_collection: {
        allowed_countries: [
          "US", "GB", "CA", "AU", "DE", "FR", "ES", "IT", "NL", "IE",
          "BE", "AT", "CH", "SE", "NO", "DK", "FI", "PT", "PL", "NZ",
        ],
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/customize`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
