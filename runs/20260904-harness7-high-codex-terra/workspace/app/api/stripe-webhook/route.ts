import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const sku = "GLOBAL-TEE-GIL-64000";
const toProdigiSize = (size: string) => size === "2XL" ? "2xl" : size.toLowerCase();

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse("Webhook is not configured", { status: 400 });
  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) { return new NextResponse(`Webhook signature verification failed: ${error instanceof Error ? error.message : "unknown error"}`, { status: 400 }); }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  const shipping = session.collected_information?.shipping_details;
  if (session.payment_status !== "paid" || !shipping || !session.metadata?.timestamp || !process.env.PRODIGI_API_KEY) return new NextResponse("Missing paid order or fulfillment configuration", { status: 400 });
  const origin = new URL(session.success_url || "https://example.invalid").origin;
  const address = shipping.address;
  // On protected Vercel deployments this system variable is injected when a
  // Protection Bypass for Automation secret is enabled. It lets Prodigi fetch
  // the one-off print asset without making the storefront publicly unprotected.
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const artworkUrl = `${origin}/api/artwork/${session.metadata.timestamp}${bypass ? `?x-vercel-protection-bypass=${encodeURIComponent(bypass)}` : ""}`;
  const prodigiOrder = {
    merchantReference: session.payment_intent?.toString() || session.id,
    idempotencyKey: event.id,
    shippingMethod: "Standard",
    recipient: { name: shipping.name, address: { line1: address.line1, line2: address.line2 || undefined, townOrCity: address.city, stateOrCounty: address.state || undefined, postalOrZipCode: address.postal_code, countryCode: address.country } },
    items: [{ sku, copies: 1, sizing: "fillPrintArea", attributes: { color: "black", size: toProdigiSize(session.metadata.size) }, assets: [{ printArea: "front", url: artworkUrl }] }],
    metadata: { stripeCheckoutSessionId: session.id, timestamp: session.metadata.timestamp, style: session.metadata.style || "unisex" }
  };
  const apiBase = process.env.PRODIGI_ENV === "live" ? "https://api.prodigi.com" : "https://api.sandbox.prodigi.com";
  try {
    const response = await fetch(`${apiBase}/v4.0/Orders`, { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": process.env.PRODIGI_API_KEY }, body: JSON.stringify(prodigiOrder) });
    if (!response.ok) { console.error("prodigi_order_error", await response.text()); return new NextResponse("Fulfillment provider rejected order", { status: 502 }); }
    console.info("prodigi_order_created", await response.json());
    return NextResponse.json({ received: true });
  } catch (error) { console.error("prodigi_request_error", error); return new NextResponse("Fulfillment request failed", { status: 502 }); }
}
