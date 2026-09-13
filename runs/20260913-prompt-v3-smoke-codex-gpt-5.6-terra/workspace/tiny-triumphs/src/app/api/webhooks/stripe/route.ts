import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { PRODUCT_SKU } from "@/lib/order";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.PRODIGI_API_KEY) return new NextResponse("Webhook is not configured", { status: 500 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing Stripe signature", { status: 400 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); } catch { return new NextResponse("Invalid signature", { status: 400 }); }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid" || session.metadata?.prodigiOrderId) return NextResponse.json({ received: true });
  const meta = session.metadata || {};
  const shipping = (session as Stripe.Checkout.Session & { shipping_details?: { name: string; address: Stripe.Address } | null }).shipping_details || session.collected_information?.shipping_details;
  if (!shipping?.address || !meta.printUrl || !meta.size || !meta.color) return new NextResponse("Incomplete fulfillment data", { status: 422 });
  const payload = {
    merchantReference: `stripe-${session.id}`,
    shippingMethod: "Standard",
    recipient: { name: shipping.name, email: session.customer_details?.email || undefined, address: { line1: shipping.address.line1, line2: shipping.address.line2 || undefined, postalOrZipCode: shipping.address.postal_code, townOrCity: shipping.address.city, stateOrCounty: shipping.address.state || undefined, countryCode: shipping.address.country } },
    items: [{ merchantReference: session.id, sku: PRODUCT_SKU, copies: 1, assets: [{ printArea: "front", url: meta.printUrl }], attributes: { size: meta.size, color: meta.color } }],
  };
  const prodigi = await fetch(`${process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com"}/v4.0/Orders`, { method: "POST", headers: { "X-API-Key": process.env.PRODIGI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!prodigi.ok) { console.error("Prodigi fulfillment failed", await prodigi.text()); return new NextResponse("Fulfillment provider unavailable", { status: 502 }); }
  const order = await prodigi.json() as { order?: { id?: string } };
  await stripe.checkout.sessions.update(session.id, { metadata: { ...meta, prodigiOrderId: order.order?.id || "submitted" } });
  return NextResponse.json({ received: true });
}
