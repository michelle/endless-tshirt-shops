import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { BASE_PRICE_USD, SHIPPING_USD, DesignParams } from "@/lib/config";

export const runtime = "nodejs";

function origin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const design: DesignParams = {
    date: String(body.date || ""),
    lat: Number(body.lat),
    lng: Number(body.lng),
    locationName: String(body.locationName || ""),
    title: String(body.title || "The Night We Met"),
    subtitle: body.subtitle ? String(body.subtitle) : undefined,
    time: body.time ? String(body.time) : undefined,
    color: String(body.color || "black"),
    size: String(body.size || "m"),
    quantity: Math.max(1, Math.min(5, Number(body.quantity) || 1)),
  };

  if (!design.date || Number.isNaN(design.lat) || Number.isNaN(design.lng)) {
    return NextResponse.json(
      { error: "Please provide a date and valid coordinates." },
      { status: 400 }
    );
  }

  const base = origin(req);
  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: BASE_PRICE_USD * 100,
            product_data: {
              name: "Stellara Custom Star Map T-Shirt",
              description: `${design.title} — ${design.locationName} (${design.date})`,
            },
          },
          quantity: design.quantity,
        },
        {
          price_data: {
            currency: "usd",
            unit_amount: SHIPPING_USD * 100,
            product_data: {
              name: "Shipping",
            },
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: [
          "US", "GB", "CA", "AU", "DE", "FR", "ES", "IT", "NL", "IE",
          "SE", "NO", "DK", "FI", "PT", "BE", "AT", "CH", "PL", "NZ",
        ],
      },
      metadata: {
        design: JSON.stringify(design),
      },
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/design`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("Checkout error", e);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
