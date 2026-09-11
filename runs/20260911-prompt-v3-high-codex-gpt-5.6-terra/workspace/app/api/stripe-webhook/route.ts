import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type Address = { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null };
function publicOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `https://${host}` : "";
}
function artworkUrl(request: NextRequest, m: Stripe.Metadata) {
  const params = new URLSearchParams({ name: m.name || "A LOCAL LEGEND", place: m.place || "UNKNOWN TERRITORY", ritual: m.ritual || "MADE A SMALL RITUAL", year: m.year || "2047" });
  return `${publicOrigin(request)}/api/print-art?${params.toString()}`;
}

async function sendToProdigi(request: NextRequest, session: Stripe.Checkout.Session) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("Prodigi is not configured.");
  if (session.payment_status !== "paid") return;
  const metadata = session.metadata || {};
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address as Address | null;
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || address.country !== "US") throw new Error("Paid session has an incomplete US shipping address.");
  const endpoint = process.env.PRODIGI_SANDBOX === "false" ? "https://api.prodigi.com/v4.0/Orders" : "https://api.sandbox.prodigi.com/v4.0/Orders";
  const payload = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name,
      email: session.customer_details?.email || undefined,
      phone: session.customer_details?.phone || undefined,
      address: { line1: address.line1, line2: address.line2 || undefined, townOrCity: address.city, stateOrCounty: address.state || undefined, postalOrZipCode: address.postal_code, countryCode: address.country },
    },
    items: [{
      sku: metadata.sku || "TEE-AS-5001",
      copies: 1,
      attributes: { color: metadata.color || "black", size: metadata.size || "m" },
      assets: [{ printArea: "front", url: artworkUrl(request, metadata) }],
    }],
  };
  const response = await fetch(endpoint, { method: "POST", headers: { "X-API-Key": key, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.text();
  if (!response.ok) throw new Error(`Prodigi rejected order: ${response.status} ${result.slice(0, 500)}`);
  console.info("Prodigi fulfillment created", { stripeSession: session.id, prodigi: result.slice(0, 500) });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  try {
    const stripe = new Stripe(key);
    const event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await sendToProdigi(request, event.data.object as Stripe.Checkout.Session);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failure", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 400 });
  }
}
