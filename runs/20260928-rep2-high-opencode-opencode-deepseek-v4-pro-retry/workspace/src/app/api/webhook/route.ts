import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, getStripe } from "@/lib/stripe";
import { createProdigiOrder, buildProdigiOrder } from "@/lib/prodigi";
import { getBaseUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${e?.message}` }, { status: 400 });
  }

  // Only act on successful payments.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as any;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "not paid" });
  }

  const metadata = session.metadata || {};
  const quantity = parseInt(metadata.quantity || "1", 10) || 1;

  // Retrieve the full session to get line items and shipping details.
  let fullSession: any = session;
  try {
    fullSession = await getStripe().checkout.sessions.retrieve(session.id, {
      expand: ["line_items"],
    });
  } catch {
    // Fall back to the event payload if retrieval fails.
  }

  const shipping = fullSession.shipping_details || session.shipping_details;
  const customer = fullSession.customer_details || session.customer_details;

  if (!shipping || !shipping.address) {
    return NextResponse.json(
      { error: "No shipping address on session" },
      { status: 400 }
    );
  }

  const addr = shipping.address;
  const recipient = {
    name: shipping.name || customer?.name || metadata.names || "Customer",
    email: customer?.email || undefined,
    line1: addr.line1,
    line2: addr.line2 || undefined,
    city: addr.city,
    state: addr.state || undefined,
    postalCode: addr.postal_code,
    countryCode: addr.country,
  };

  // Build the design asset URL from the customization metadata.
  const baseUrl = getBaseUrl(req);
  const designParams = new URLSearchParams({
    date: metadata.date || "",
    lat: metadata.lat || "0",
    lng: metadata.lng || "0",
    title: metadata.title || "",
    names: metadata.names || "",
    location: metadata.locationLabel || "",
    color: metadata.shirtColor || "black",
    format: "png",
    w: "3300",
  });
  if (metadata.time) designParams.set("time", metadata.time);
  if (metadata.message) designParams.set("message", metadata.message);
  const assetUrl = `${baseUrl}/api/design?${designParams.toString()}`;

  const merchantReference = `stellara_${session.id}`;

  try {
    const order = buildProdigiOrder({
      merchantReference,
      recipient,
      sku: "GLOBAL-TEE-GIL-64000",
      color: metadata.shirtColor || "black",
      size: metadata.size || "M",
      quantity,
      assetUrl,
    });
    const result = await createProdigiOrder(order);
    return NextResponse.json({ received: true, prodigiOrderId: result.id });
  } catch (e: any) {
    // Log and return 500 so Stripe retries the event.
    console.error("Prodigi order creation failed:", e?.message);
    return NextResponse.json(
      { error: `Prodigi order failed: ${e?.message}` },
      { status: 500 }
    );
  }
}
