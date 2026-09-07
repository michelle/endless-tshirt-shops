import { NextRequest, NextResponse } from "next/server";
import { newMerchantReference, newOrderToken, placeProdigiOrder, priceOrder } from "@/lib/orders";
import { paymentMode } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Checkout. Validates and prices the cart server-side, then either
 *  - stripe mode: returns a Stripe Checkout URL (order is placed with Prodigi after payment), or
 *  - sandbox mode: places the Prodigi (sandbox) order immediately with no payment.
 */
export async function POST(req: NextRequest) {
  let priced;
  try {
    priced = await priceOrder(await req.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid order" }, { status: 400 });
  }
  try {
    if (paymentMode() === "stripe") {
      const { createCheckoutSession } = await import("@/lib/stripe");
      const { url } = await createCheckoutSession(priced);
      return NextResponse.json({ redirect: url });
    }
    const { orderId, token } = await placeProdigiOrder({
      priced,
      token: newOrderToken(),
      merchantReference: newMerchantReference(),
      payment: { mode: "sandbox" },
    });
    return NextResponse.json({ orderId, token });
  } catch (e) {
    console.error("checkout failed", e);
    return NextResponse.json({ error: "We couldn't place the order right now. Please try again in a minute." }, { status: 502 });
  }
}
