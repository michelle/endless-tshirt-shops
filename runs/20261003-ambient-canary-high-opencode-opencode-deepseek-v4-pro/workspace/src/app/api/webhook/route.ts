// Stripe webhook handler. On successful payment, submit the order to Prodigi.

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createProdigiOrder, type ShippingAddress } from "@/lib/prodigi";
import type { Customization } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only fulfill on successful payment. Ignore everything else.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as any;

  // Idempotency: never send the same order to Prodigi twice.
  const merchantReference = `pawtraits-${session.id}`;

  try {
    const metadata = session.metadata ?? {};
    const customization: Customization = {
      imageUrl: metadata.imageUrl,
      style: metadata.style,
      color: metadata.color,
      size: metadata.size,
      petName: metadata.petName ?? "",
    };

    if (!customization.imageUrl) {
      throw new Error("Missing imageUrl in session metadata");
    }

    const shipping: ShippingAddress = {
      name: session.shipping_details?.name ?? session.customer_details?.name ?? "Customer",
      line1: session.shipping_details?.address?.line1 ?? "",
      line2: session.shipping_details?.address?.line2 ?? "",
      city: session.shipping_details?.address?.city ?? "",
      state: session.shipping_details?.address?.state ?? "",
      postalCode: session.shipping_details?.address?.postal_code ?? "",
      country: session.shipping_details?.address?.country ?? "US",
      email: session.customer_details?.email ?? "",
    };

    if (!shipping.line1 || !shipping.postalCode || !shipping.country) {
      throw new Error("Incomplete shipping address on session");
    }

    const result = await createProdigiOrder(customization, shipping, merchantReference);
    console.log(`Prodigi order created: ${result.id} (${result.status}) for ${merchantReference}`);
    return NextResponse.json({ received: true, prodigiOrderId: result.id });
  } catch (err: any) {
    // Log and return 500 so Stripe retries the event. We do NOT acknowledge
    // success unless the order actually reached Prodigi.
    console.error("Fulfillment failed:", err);
    return NextResponse.json(
      { error: "Fulfillment failed", detail: err.message },
      { status: 500 },
    );
  }
}
