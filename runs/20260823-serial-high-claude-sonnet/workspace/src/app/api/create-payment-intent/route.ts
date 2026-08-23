import { NextResponse } from "next/server";
import {
  CURRENCY,
  GARMENT_COLOR,
  PRICE_CENTS,
  SP_PRODUCTS,
  SP_SIZES,
  ShirtSize,
  ShirtStyle,
} from "@/lib/constants";
import { getQuote, ScalablePressError, uploadDesign } from "@/lib/scalablepress";
import { stripe } from "@/lib/stripe";

export const maxDuration = 30;

type RequestBody = {
  style: ShirtStyle;
  size: ShirtSize;
  email: string;
  artwork: string;
  address: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
};

function isValidBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.style !== "fitted" && b.style !== "unisex") return false;
  if (!["S", "M", "L", "XL"].includes(b.size as string)) return false;
  if (typeof b.email !== "string" || !b.email.includes("@")) return false;
  if (typeof b.artwork !== "string" || !b.artwork.startsWith("data:image/png;base64,"))
    return false;
  const a = b.address as Record<string, unknown> | undefined;
  if (
    !a ||
    typeof a.name !== "string" ||
    !a.name.trim() ||
    typeof a.address1 !== "string" ||
    !a.address1.trim() ||
    typeof a.city !== "string" ||
    !a.city.trim() ||
    typeof a.state !== "string" ||
    !a.state.trim() ||
    typeof a.zip !== "string" ||
    !a.zip.trim()
  ) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "Missing or invalid order details" },
      { status: 400 },
    );
  }

  const artBuffer = Buffer.from(
    body.artwork.slice("data:image/png;base64,".length),
    "base64",
  );

  try {
    const designId = await uploadDesign(artBuffer);

    const quote = await getQuote({
      productId: SP_PRODUCTS[body.style],
      size: SP_SIZES[body.size],
      color: GARMENT_COLOR,
      designId,
      address: {
        name: body.address.name,
        address1: body.address.address1,
        address2: body.address.address2,
        city: body.address.city,
        state: body.address.state,
        zip: body.address.zip,
        country: "US",
      },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      receipt_email: body.email,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderToken: quote.orderToken,
        designId,
        style: body.style,
        size: body.size,
        email: body.email,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    if (err instanceof ScalablePressError) {
      console.error(`[scalable-press:${err.step}]`, err.body);
      return NextResponse.json(
        { error: "We couldn't prepare that shirt for printing. Please try again." },
        { status: 502 },
      );
    }
    console.error("[create-payment-intent]", err);
    return NextResponse.json(
      { error: "Something went wrong starting your order." },
      { status: 500 },
    );
  }
}
