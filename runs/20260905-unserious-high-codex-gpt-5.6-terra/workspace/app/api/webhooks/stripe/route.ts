import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function publicUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return (configured ? configured.replace(/\/$/, "") : new URL(request.url).origin);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signingSecret || !process.env.PRODIGI_API_KEY) return new NextResponse("Missing server configuration", { status: 500 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing Stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(secret).webhooks.constructEvent(await request.text(), signature, signingSecret);
  } catch (error) {
    console.warn("Stripe webhook signature failed", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  const shipping = session.collected_information?.shipping_details;
  if (session.payment_status !== "paid" || !shipping || !session.customer_details?.email) {
    return new NextResponse("Order not ready for fulfillment", { status: 400 });
  }

  const address = shipping.address;
  const designTime = session.metadata?.designTime;
  const size = session.metadata?.size;
  if (!designTime || !size || !address.line1 || !address.city || !address.postal_code || !address.country) {
    return new NextResponse("Checkout is missing fulfillment details", { status: 400 });
  }

  const artUrl = `${publicUrl(request)}/api/print-art?stamp=${encodeURIComponent(designTime)}`;
  const prodigiRequest = {
    merchantReference: session.id,
    idempotencyKey: `stripe-${session.id}`,
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name,
      email: session.customer_details.email,
      phoneNumber: session.customer_details.phone ?? undefined,
      address: {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        townOrCity: address.city,
        stateOrCounty: address.state ?? undefined,
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
      },
    },
    items: [{
      sku: "TEE-AS-5001",
      copies: 1,
      sizing: "fitPrintArea",
      attributes: { color: "black", size: size.toLowerCase() },
      recipientCost: { amount: "22.50", currency: "USD" },
      assets: [{ printArea: "front", url: artUrl }],
    }],
    metadata: { stripeCheckoutSession: session.id, designTime, fit: session.metadata?.fit ?? "classic" },
  };

  const apiBase = (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, "");
  const prodigi = await fetch(`${apiBase}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": process.env.PRODIGI_API_KEY },
    body: JSON.stringify(prodigiRequest),
  });
  if (!prodigi.ok) {
    console.error("Prodigi order failed", prodigi.status, await prodigi.text());
    return new NextResponse("Fulfillment request failed", { status: 502 });
  }
  return NextResponse.json({ received: true });
}
