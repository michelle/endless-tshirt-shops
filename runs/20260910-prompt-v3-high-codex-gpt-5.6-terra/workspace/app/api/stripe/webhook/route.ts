import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
export const runtime = "nodejs";
type Checkout = Stripe.Checkout.Session & { shipping_details?: Stripe.Checkout.Session.ShippingDetails | null };
export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY, webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature"); if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  let event: Stripe.Event; try { event = new Stripe(stripeKey).webhooks.constructEvent(await request.text(), signature, webhookSecret); } catch { return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 }); }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return NextResponse.json({ received: true });
  const session = event.data.object as Checkout; if (session.payment_status !== "paid") return NextResponse.json({ received: true });
  const metadata = session.metadata || {}; const shipping = session.shipping_details || (session as unknown as { collected_information?: { shipping_details?: Checkout["shipping_details"] } }).collected_information?.shipping_details;
  if (!shipping?.address || !metadata.artworkUrl || !metadata.productSku || !metadata.color || !metadata.size) return NextResponse.json({ error: "Paid checkout is missing fulfillment information." }, { status: 500 });
  const prodigiKey = process.env.PRODIGI_API_KEY; if (!prodigiKey) return NextResponse.json({ error: "Prodigi is not configured." }, { status: 500 });
  const address = shipping.address; const payload = { merchantReference: session.id, idempotencyKey: session.id, shippingMethod: "standard", recipient: { name: shipping.name || session.customer_details?.name || metadata.name, email: session.customer_details?.email, address: { line1: address.line1, line2: address.line2 || null, townOrCity: address.city, stateOrCounty: address.state || null, postalOrZipCode: address.postal_code, countryCode: address.country } }, items: [{ sku: metadata.productSku, copies: 1, sizing: "fillPrintArea", attributes: { color: metadata.color, size: metadata.size }, assets: [{ printArea: "front", url: metadata.artworkUrl }] }], metadata: { stripeCheckoutSessionId: session.id, futurefolkMood: metadata.mood || "", homeBase: metadata.place || "" } };
  const base = (process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0").replace(/\/$/, ""); const response = await fetch(`${base}/orders`, { method: "POST", headers: { "X-API-Key": prodigiKey, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) { console.error("Prodigi fulfillment failed", response.status, await response.text()); return NextResponse.json({ error: "Prodigi fulfillment request failed." }, { status: 500 }); }
  return NextResponse.json({ received: true });
}
