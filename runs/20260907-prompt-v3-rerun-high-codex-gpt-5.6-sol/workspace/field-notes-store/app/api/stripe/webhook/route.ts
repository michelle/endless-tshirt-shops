import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { designFromMetadata, encodeDesign, PRODUCT, signArtwork } from "@/lib/design";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

async function fulfillPaidSession(sessionId: string, requestOrigin: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return;
  if (session.metadata?.prodigi_order_id) return;

  const design = designFromMetadata(session.metadata || {});
  const shipping = session.collected_information?.shipping_details;
  const email = session.customer_details?.email;
  const phone = session.customer_details?.phone;
  if (!shipping?.name || !shipping.address?.line1 || !shipping.address.city || !shipping.address.postal_code || !shipping.address.country) {
    throw new Error("Paid session is missing a complete shipping address.");
  }

  const prodigiKey = process.env.PRODIGI_API_KEY;
  const artworkSecret = process.env.ARTWORK_SIGNING_SECRET;
  if (!prodigiKey || !artworkSecret) throw new Error("Fulfillment is not configured.");
  const origin = process.env.PUBLIC_SITE_URL || requestOrigin;
  const payload = encodeDesign(design);
  const artworkUrl = new URL("/api/artwork", origin);
  artworkUrl.searchParams.set("payload", payload);
  artworkUrl.searchParams.set("sig", signArtwork(payload, artworkSecret));
  const idempotencyKey = createHash("sha256").update(`field-notes:${session.id}`).digest("hex");

  const prodigiResponse = await fetch("https://api.sandbox.prodigi.com/v4.0/orders", {
    method: "POST",
    headers: { "X-API-Key": prodigiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey,
      shippingMethod: "Budget",
      recipient: {
        name: shipping.name,
        email: email || undefined,
        phoneNumber: phone || undefined,
        address: {
          line1: shipping.address.line1,
          line2: shipping.address.line2 || undefined,
          postalOrZipCode: shipping.address.postal_code,
          countryCode: shipping.address.country,
          townOrCity: shipping.address.city,
          stateOrCounty: shipping.address.state || undefined,
        },
      },
      items: [{
        merchantReference: `${session.id}-shirt`,
        sku: PRODUCT.sku,
        copies: design.quantity,
        sizing: "fitPrintArea",
        attributes: { color: PRODUCT.color, size: design.size },
        assets: [{ printArea: "front", url: artworkUrl.toString() }],
        recipientCost: { amount: ((PRODUCT.unitAmount * design.quantity) / 100).toFixed(2), currency: PRODUCT.currency.toUpperCase() },
      }],
      metadata: { stripeSessionId: session.id, concept: "field-notes" },
    }),
  });
  const prodigi = await prodigiResponse.json() as { outcome?: string; order?: { id?: string }; errors?: unknown };
  if (!prodigiResponse.ok || !prodigi.order?.id) throw new Error(`Prodigi rejected fulfillment: ${prodigi.outcome || prodigiResponse.status}`);
  await stripe.checkout.sessions.update(session.id, { metadata: { ...session.metadata, prodigi_order_id: prodigi.order.id, fulfillment_status: prodigi.outcome || "created" } });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  try {
    const stripe = getStripe();
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    const event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfillPaidSession((event.data.object as Stripe.Checkout.Session).id, new URL(request.url).origin);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook fulfillment error", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 400 });
  }
}
