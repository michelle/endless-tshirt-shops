import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { isShirtSize, isShirtStyle, PRICE_CENTS } from "@/lib/products";
import { fulfillOrder } from "@/lib/fulfill";
import type { ShipAddress } from "@/lib/scalablePress";

interface CheckoutBody {
  style?: string;
  size?: string;
  email?: string;
  paymentMethodId?: string;
  address?: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export async function POST(req: NextRequest) {
  const body: CheckoutBody | null = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { style, size, email, paymentMethodId, address } = body;

  if (!isShirtStyle(style) || !isShirtSize(size)) {
    return NextResponse.json({ error: "Invalid style or size" }, { status: 400 });
  }
  if (!paymentMethodId) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }
  if (
    !address?.name ||
    !address.address1 ||
    !address.city ||
    !address.state ||
    !address.zip
  ) {
    return NextResponse.json({ error: "Missing shipping address" }, { status: 400 });
  }

  const shipAddress: ShipAddress = {
    name: address.name,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: "US",
  };

  const timestampMs = Date.now();

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      receipt_email: email,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      shipping: {
        name: address.name,
        address: {
          line1: address.address1,
          line2: address.address2,
          city: address.city,
          state: address.state,
          postal_code: address.zip,
          country: "US",
        },
      },
      metadata: { style, size, ts: String(timestampMs) },
      description: `A datetime.store shirt (${style}, size ${size})`,
    });
  } catch (err) {
    const stripeErr = err as { message?: string };
    return NextResponse.json(
      { error: stripeErr.message ?? "Payment failed" },
      { status: 402 }
    );
  }

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: `Payment could not be completed (status: ${paymentIntent.status})` },
      { status: 402 }
    );
  }

  try {
    const orderId = await fulfillOrder(style, size, timestampMs, shipAddress);
    return NextResponse.json({ order: orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Payment already succeeded — surface the print-fulfillment failure
    // distinctly so the customer knows their card was charged.
    return NextResponse.json(
      {
        error:
          "Your payment went through, but we hit a snag queuing the print job. We'll follow up by email.",
        paymentIntentId: paymentIntent.id,
        detail: message,
      },
      { status: 502 }
    );
  }
}
