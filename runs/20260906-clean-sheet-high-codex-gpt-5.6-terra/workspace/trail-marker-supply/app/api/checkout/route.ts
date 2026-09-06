import Stripe from "stripe";
import { NextResponse } from "next/server";
import { PRODUCT, normalizeSelection } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Secure checkout is not configured yet." }, { status: 503 });
  const body = await request.json();
  const selection = normalizeSelection(body.size, body.color);
  if (!selection) return NextResponse.json({ error: "Choose an available size and color." }, { status: 400 });
  const origin = new URL(request.url).origin;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment", submit_type: "pay", billing_address_collection: "required",
    shipping_address_collection: { allowed_countries: ["US"] }, phone_number_collection: { enabled: true },
    success_url: `${origin}/?order=success`, cancel_url: `${origin}/?order=cancelled`, customer_creation: "always",
    metadata: { productId: PRODUCT.id, size: selection.size, color: selection.color },
    line_items: [{ quantity: 1, price_data: { currency: PRODUCT.currency, unit_amount: PRODUCT.price, product_data: { name: PRODUCT.name, description: `${selection.color} / ${selection.size.toUpperCase()}` } } }],
  });
  return NextResponse.json({ url: session.url });
}
