import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { orderSchema, sealOrder, siteUrl } from "@/lib/order";

export const runtime = "nodejs";

const allowedCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "US", "CA", "GB", "AU", "NZ", "IE", "FR", "DE", "NL", "BE", "ES", "IT", "PT", "AT", "DK", "SE", "NO", "FI", "CH", "PL", "CZ", "JP", "SG",
];

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Secure checkout is being connected. Please check back shortly." }, { status: 503 });

  try {
    const order = orderSchema.parse(await request.json());
    const encryptedOrder = sealOrder(order);
    const stripe = new Stripe(secret);
    const origin = siteUrl(request.nextUrl.origin);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        quantity: order.quantity,
        price_data: {
          currency: "usd",
          unit_amount: 4200,
          product_data: {
            name: "ORBIT/ONE Personalized Tee",
            description: `${order.shirtColor === "black" ? "Black" : "White"} / ${order.size} / ${order.place}`,
          },
        },
      }],
      shipping_address_collection: { allowed_countries: allowedCountries },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", display_name: "Tracked standard shipping", fixed_amount: { amount: 600, currency: "usd" }, delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 12 } } } }],
      phone_number_collection: { enabled: true },
      customer_creation: "always",
      metadata: { order_payload: encryptedOrder },
      payment_intent_data: { metadata: { product: "ORBIT_ONE" } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#studio`,
      custom_text: { shipping_address: { message: "We use this address only to print and ship your one-of-one shirt." } },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) return NextResponse.json({ error: "Please check the customization details and try again." }, { status: 400 });
    console.error("Checkout session creation failed", error);
    return NextResponse.json({ error: "Checkout could not start. Please try again." }, { status: 500 });
  }
}
