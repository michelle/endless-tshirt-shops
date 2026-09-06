import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getShirt } from "@/lib/shirts";
import { createProdigiOrder } from "@/lib/prodigi";
import { getBaseUrl } from "@/lib/base-url";

// Stripe requires the raw request body to verify the webhook signature, so
// this route must not be pre-parsed as JSON.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("Missing Stripe signature header or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const slug = session.metadata?.slug;
  const size = session.metadata?.size;

  if (!slug || !size) {
    console.error("Checkout session missing slug/size metadata", session.id);
    return NextResponse.json({ received: true });
  }

  const shirt = getShirt(slug);
  if (!shirt) {
    console.error("Checkout session references unknown shirt", slug);
    return NextResponse.json({ received: true });
  }

  const shippingDetails = session.collected_information?.shipping_details;
  const address = shippingDetails?.address ?? session.customer_details?.address;
  const name = shippingDetails?.name ?? session.customer_details?.name;

  if (!address || !name) {
    console.error("Checkout session missing shipping address", session.id);
    return NextResponse.json({ received: true });
  }

  const baseUrl = getBaseUrl(req);

  try {
    await createProdigiOrder({
      merchantReference: session.id,
      recipient: {
        name,
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address: {
          line1: address.line1 ?? "",
          line2: address.line2 ?? undefined,
          postalOrZipCode: address.postal_code ?? "",
          countryCode: address.country ?? "US",
          townOrCity: address.city ?? "",
          stateOrCounty: address.state ?? undefined,
        },
      },
      items: [
        {
          merchantReference: `${session.id}-item-1`,
          size,
          copies: 1,
          assetUrl: `${baseUrl}/designs/${shirt.slug}.png`,
        },
      ],
    });
  } catch (err) {
    console.error("Failed to create Prodigi order", err);
    // Non-200 so Stripe retries the webhook later.
    return NextResponse.json({ error: "Prodigi order failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
