import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { decodeMoment, signMoment } from "@/lib/artwork";
import { createProdigiOrder } from "@/lib/prodigi";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) return new NextResponse("Webhook is not configured", { status: 503 });
  const body = await request.text();
  let event: Stripe.Event;
  try { event = new Stripe(stripeKey).webhooks.constructEvent(body, request.headers.get("stripe-signature") || "", secret); }
  catch { return new NextResponse("Invalid signature", { status: 400 }); }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  try {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    const moment = decodeMoment(session.metadata?.moment || "");
    const address = session.shipping_details?.address;
    const email = session.customer_details?.email;
    const name = session.shipping_details?.name;
    if (!moment || !address || !email || !name || !address.line1 || !address.city || !address.postal_code || !address.country) throw new Error("Order is missing shipping details");
    const origin = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
    const data = encodeURIComponent(session.metadata!.moment!);
    const assetUrl = `${origin}/api/artwork?d=${data}&s=${signMoment(moment)}`;
    await createProdigiOrder({ reference: event.id, moment, size: session.metadata?.size || "m", color: session.metadata?.color || "black", assetUrl, callbackUrl: `${origin}/api/prodigi-callback`, recipient: { name, email, address: { line1: address.line1, line2: address.line2, city: address.city, state: address.state || "", postalCode: address.postal_code, country: address.country } } });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("fulfillment", error);
    return new NextResponse("Fulfillment failed; Stripe will retry", { status: 500 });
  }
}
