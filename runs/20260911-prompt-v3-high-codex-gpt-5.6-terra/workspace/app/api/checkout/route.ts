import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const COLORS = new Set(["black", "white", "navy blue", "heather grey"]);
const SIZES = new Set(["s", "m", "l", "xl", "2xl"]);
const text = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, max) : "";

function originFor(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  throw new Error("Store URL is not configured.");
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Checkout is not configured yet. Please try again shortly." }, { status: 503 });
  try {
    const input = await request.json();
    const name = text(input.name, 26);
    const place = text(input.place, 30);
    const ritual = text(input.ritual, 46);
    const year = text(input.year, 4).replace(/\D/g, "");
    const color = text(input.color, 20).toLowerCase();
    const size = text(input.size, 4).toLowerCase();
    if (!name || !place || !ritual || !/^\d{4}$/.test(year) || !COLORS.has(color) || !SIZES.has(size)) {
      return NextResponse.json({ error: "Please complete the personalization and select an available size and color." }, { status: 400 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = originFor(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US"] },
      customer_creation: "always",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 4400,
          product_data: { name: `Future Fossil Club: ${name}`, description: `Archive ${year} · ${color} · ${size.toUpperCase()} · US standard shipping included` },
        },
      }],
      metadata: { name, place, ritual, year, color, size, sku: "TEE-AS-5001" },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error", error);
    return NextResponse.json({ error: "Could not start secure checkout. Please try again." }, { status: 500 });
  }
}
