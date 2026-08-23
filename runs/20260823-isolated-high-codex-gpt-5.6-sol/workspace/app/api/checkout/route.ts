import { NextResponse } from "next/server";
import { PRICE_CENTS, orderSelectionSchema } from "@/lib/product";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function requestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const selection = orderSelectionSchema.parse(await request.json());
    if (Math.abs(Date.now() - selection.capturedAt) > 5 * 60_000) {
      return NextResponse.json({ error: "That moment has passed. Please capture a new one." }, { status: 400 });
    }
    const origin = requestOrigin(request);
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US"] },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_CENTS,
          product_data: {
            name: "The Timestamp Tee",
            description: `${selection.style === "fitted" ? "Fitted" : "Unisex"} / ${selection.size} / ${selection.capturedAt}`,
            metadata: { style: selection.style, size: selection.size, captured_at: String(selection.capturedAt) },
          },
        },
      }],
      metadata: {
        shirt_style: selection.style,
        shirt_size: selection.size,
        captured_at: String(selection.capturedAt),
      },
      payment_intent_data: {
        description: `datetime.store timestamp tee · ${selection.capturedAt}`,
        metadata: { fulfillment_status: "pending", captured_at: String(selection.capturedAt) },
      },
      custom_text: { shipping_address: { message: "Free U.S. shipping. Each timestamp tee is made to order." } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout.create_failed", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
