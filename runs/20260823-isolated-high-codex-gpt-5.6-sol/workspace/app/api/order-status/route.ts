import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("session_id");
  if (!id?.startsWith("cs_")) return NextResponse.json({ error: "Invalid checkout" }, { status: 400 });
  try {
    const session = await stripeClient().checkout.sessions.retrieve(id, { expand: ["payment_intent"] });
    const paymentIntent = typeof session.payment_intent === "object" ? session.payment_intent : null;
    const fulfillment = paymentIntent?.metadata.fulfillment_status || "pending";
    return NextResponse.json({
      paid: session.payment_status === "paid",
      fulfillment,
      mode: paymentIntent?.metadata.fulfillment_mode || (process.env.FULFILLMENT_MODE === "live" ? "live" : "quote"),
      capturedAt: session.metadata?.captured_at,
      style: session.metadata?.shirt_style,
      size: session.metadata?.shirt_size,
    });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
