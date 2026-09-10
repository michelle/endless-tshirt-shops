import Stripe from "stripe";
import { readArtToken } from "../../../lib/design";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return new Response("Webhook not configured", { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(payload, signature || "", process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { console.error("webhook_signature_failed", error); return new Response("Invalid signature", { status: 400 }); }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return Response.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return Response.json({ received: true, skipped: "payment not paid" });
  const token = session.metadata?.designToken;
  const design = token ? readArtToken(token) : null;
  const shipping = session.shipping_details;
  if (!token || !design || !shipping?.address?.line1 || !shipping.address.country) return new Response("Missing order details", { status: 400 });
  if (!process.env.PRODIGI_API_KEY) return new Response("Prodigi not configured", { status: 503 });
  const site = new URL(request.url).origin;
  const artifactUrl = `${site}/api/art?token=${encodeURIComponent(token)}`;
  const recipient = { name: shipping.name, email: session.customer_details?.email || "", phoneNumber: session.customer_details?.phone || "", address: { line1: shipping.address.line1, line2: shipping.address.line2 || "", postalOrZipCode: shipping.address.postal_code || "", countryCode: shipping.address.country, townOrCity: shipping.address.city || "", stateOrCounty: shipping.address.state || null } };
  const order = { merchantReference: `OP-${session.id}`, idempotencyKey: session.id, shippingMethod: "Budget", recipient, items: [{ sku: "TEE-AS-5001", copies: 1, sizing: "fillPrintArea", attributes: { size: design.size.toLowerCase(), color: design.color, brand: "AS Colour", edge: "Crew neck", gender: "Men's", paperType: "100% cotton", style: "5001" }, assets: [{ printArea: "front", url: artifactUrl }] }], metadata: { stripeSessionId: session.id, design: { place: design.place, name: design.name, message: design.message } } };
  const base = process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";
  const response = await fetch(`${base.replace(/\/$/, "")}/Orders`, { method: "POST", headers: { "X-API-Key": process.env.PRODIGI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify(order) });
  if (!response.ok) { console.error("prodigi_order_failed", response.status, await response.text()); return new Response("Fulfillment failed", { status: 502 }); }
  const result = await response.json();
  console.log("prodigi_order_created", result?.order?.id || result?.outcome);
  return Response.json({ received: true, prodigiOrderId: result?.order?.id });
}
