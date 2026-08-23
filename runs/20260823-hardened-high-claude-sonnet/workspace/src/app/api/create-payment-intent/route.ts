import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { CURRENCY, PRICE_CENTS, isShirtSize, isShirtStyle } from "@/lib/product";

export const runtime = "nodejs";

type Body = {
  style?: string;
  size?: string;
  email?: string;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { style, size, email, name, address1, address2, city, state, zip } = body;

  if (!isShirtStyle(style)) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }
  if (!isShirtSize(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  if (!email || !name || !address1 || !city || !state || !zip) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const momentISO = new Date().toISOString();

  const paymentIntent = await stripe().paymentIntents.create({
    amount: PRICE_CENTS,
    currency: CURRENCY,
    automatic_payment_methods: { enabled: true },
    receipt_email: email,
    shipping: {
      name,
      address: {
        line1: address1,
        line2: address2 || undefined,
        city,
        state,
        postal_code: zip,
        country: "US",
      },
    },
    metadata: {
      style,
      size,
      momentISO,
      fulfillment_status: "pending",
    },
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    momentISO,
  });
}
