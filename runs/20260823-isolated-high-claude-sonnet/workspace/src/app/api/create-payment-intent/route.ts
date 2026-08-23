import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { CURRENCY, PRICE_CENTS } from "@/lib/products";

export async function POST() {
  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      // Card + Link only: both confirm in-page with no redirect, so we never
      // need a return_url or a separate redirect-landing route.
      payment_method_types: ["card", "link"],
    });
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error("create-payment-intent failed", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
