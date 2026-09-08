import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function getStripe() { const key = process.env.STRIPE_SECRET_KEY; if (!key) throw new Error("Missing STRIPE_SECRET_KEY"); return new Stripe(key); }

async function sendToProdigi(session: Stripe.Checkout.Session) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("Missing PRODIGI_API_KEY");
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const meta = session.metadata || {};
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) throw new Error("Stripe session has no complete shipping address");
  const quantity = Math.min(3, Math.max(1, Number(meta.quantity) || 1));
  const response = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantReference: `signal-noise-${session.id}`,
      idempotencyKey: `signal-noise-${session.id}`,
      shippingMethod: "Standard",
      recipient: { name: shipping.name, email: session.customer_details?.email || undefined, address: { line1: address.line1, line2: address.line2 || undefined, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || undefined } },
      items: [{ merchantReference: meta.phrase || "custom signal", sku: "TEE-AS-5001", copies: quantity, sizing: "fitPrintArea", attributes: { color: meta.color || "black", size: meta.size || "m" }, recipientCost: { amount: "38.00", currency: "USD" }, assets: [{ printArea: "front", url: meta.designUrl }] }],
      metadata: { stripeSessionId: session.id, phrase: meta.phrase || "", theme: meta.theme || "" },
    }),
  });
  const payload = await response.json();
  if (!response.ok || (payload.outcome && !["Created", "Ok"].includes(payload.outcome))) throw new Error(`Prodigi rejected order: ${JSON.stringify(payload)}`);
  return payload;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return new NextResponse("Webhook is not configured", { status: 400 });
  try {
    const body = await request.text();
    const event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        const completeSession = await getStripe().checkout.sessions.retrieve(session.id);
        await sendToProdigi(completeSession);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error", error);
    return new NextResponse("Webhook error", { status: 400 });
  }
}
