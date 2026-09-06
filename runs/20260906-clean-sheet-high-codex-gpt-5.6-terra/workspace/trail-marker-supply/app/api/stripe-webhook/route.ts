import Stripe from "stripe";
import { NextResponse } from "next/server";
import { PRODUCT } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !signature) return new NextResponse("Webhook not configured", { status: 400 });
  let event: Stripe.Event;
  try { const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); } catch { return new NextResponse("Invalid signature", { status: 400 }); }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid" || session.metadata?.productId !== PRODUCT.id) return NextResponse.json({ received: true });
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const name = shipping?.name || session.customer_details?.name;
  if (!address || !name || !session.metadata.size || !session.metadata.color) return new NextResponse("Missing shipping details", { status: 400 });
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin;
  const payload = {
    merchantReference: `stripe_${session.id}`, idempotencyKey: session.id, shippingMethod: "Standard",
    recipient: { name, email: session.customer_details?.email || undefined, phoneNumber: session.customer_details?.phone || undefined, address: { line1: address.line1, line2: address.line2 || undefined, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || undefined } },
    items: [{ merchantReference: PRODUCT.id, sku: PRODUCT.prodigiSku, copies: 1, sizing: "fitPrintArea", attributes: { color: session.metadata.color, size: session.metadata.size }, assets: [{ printArea: "front", url: `${origin}/trail-marker-print.png` }] }],
    callbackUrl: `${origin}/api/prodigi-webhook`,
  };
  const response = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": process.env.PRODIGI_API_KEY || "" }, body: JSON.stringify(payload) });
  if (!response.ok) return new NextResponse("Fulfillment request failed", { status: 502 });
  return NextResponse.json({ received: true });
}
