import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  isShirtSize,
  isShirtStyle,
  PRICE_CENTS,
  SP_GARMENT_COLOR,
  SP_PRODUCT_IDS,
  SP_SIZE_CODES,
} from "@/lib/products";
import {
  createDesign,
  createQuote,
  placeOrder,
  ScalablePressError,
  type ShippingAddress,
} from "@/lib/scalablepress";

interface FulfillRequestBody {
  paymentIntentId?: string;
  style?: string;
  size?: string;
  artwork?: string;
  shipping?: ShippingAddress;
}

function isValidAddress(a: unknown): a is ShippingAddress {
  if (!a || typeof a !== "object") return false;
  const addr = a as Record<string, unknown>;
  return (
    typeof addr.name === "string" &&
    addr.name.trim().length > 0 &&
    typeof addr.address1 === "string" &&
    addr.address1.trim().length > 0 &&
    typeof addr.city === "string" &&
    addr.city.trim().length > 0 &&
    typeof addr.state === "string" &&
    addr.state.trim().length > 0 &&
    typeof addr.zip === "string" &&
    addr.zip.trim().length > 0 &&
    typeof addr.country === "string" &&
    addr.country.trim().length > 0
  );
}

export async function POST(req: Request) {
  const stripe = getStripe();
  let body: FulfillRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { paymentIntentId, style, size, artwork, shipping } = body;

  if (!paymentIntentId || typeof paymentIntentId !== "string") {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }
  if (!style || !isShirtStyle(style)) {
    return NextResponse.json({ error: "Invalid shirt style" }, { status: 400 });
  }
  if (!size || !isShirtSize(size)) {
    return NextResponse.json({ error: "Invalid shirt size" }, { status: 400 });
  }
  if (!artwork || typeof artwork !== "string") {
    return NextResponse.json({ error: "Missing artwork" }, { status: 400 });
  }
  if (!isValidAddress(shipping)) {
    return NextResponse.json(
      { error: "A complete shipping address is required" },
      { status: 400 }
    );
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    console.error("could not retrieve payment intent", err);
    return NextResponse.json({ error: "Unknown payment" }, { status: 400 });
  }

  if (paymentIntent.amount !== PRICE_CENTS || paymentIntent.currency !== "usd") {
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
  }
  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: `Payment has not succeeded (status: ${paymentIntent.status})` },
      { status: 400 }
    );
  }

  // Idempotent: if this payment was already fulfilled, return the existing order.
  if (paymentIntent.metadata.spOrderId) {
    return NextResponse.json({ orderId: paymentIntent.metadata.spOrderId });
  }

  try {
    const designId = await createDesign(artwork);
    const quote = await createQuote({
      designId,
      productId: SP_PRODUCT_IDS[style],
      color: SP_GARMENT_COLOR,
      sizeCode: SP_SIZE_CODES[size],
      address: shipping,
    });

    if (!quote.orderToken) {
      throw new ScalablePressError("quote", quote.orderIssues ?? "no orderToken returned");
    }

    const order = await placeOrder(quote.orderToken);

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        spOrderId: order.orderId,
        spOrderToken: quote.orderToken,
        style,
        size,
      },
    });

    return NextResponse.json({ orderId: order.orderId });
  } catch (err) {
    console.error("fulfill-order: Scalable Press flow failed, refunding", err);
    try {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: { fulfillmentFailed: "true" },
      });
    } catch (refundErr) {
      console.error("fulfill-order: refund also failed", refundErr);
    }

    const message =
      err instanceof ScalablePressError
        ? "Our print partner could not accept this order. You have not been charged (any payment was refunded)."
        : "Something went wrong placing your order. You have not been charged (any payment was refunded).";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
