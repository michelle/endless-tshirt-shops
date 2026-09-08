import Stripe from "stripe";

export const runtime = "nodejs";

const prodigiBase = () => process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prodigiKey = process.env.PRODIGI_API_KEY;
  if (!secret || !webhookSecret || !prodigiKey) return new Response("Webhook is not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    const stripe = new Stripe(secret);
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("stripe_signature_error", error);
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.type !== "checkout.session.completed") return Response.json({ received: true });
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return Response.json({ received: true, skipped: "unpaid" });
  const metadata = session.metadata || {};
  const required = ["name", "place", "sign", "palette", "color", "size", "artwork_origin", "sku"];
  if (!required.every(key => metadata[key])) return new Response("Missing fulfillment metadata", { status: 400 });
  const artParams = new URLSearchParams({ name: metadata.name!, place: metadata.place!, sign: metadata.sign!, palette: metadata.palette! });
  const payload = {
    merchantReference: `stripe-${session.id}`,
    idempotencyKey: `stripe-${session.id}`,
    shippingMethod: "Standard",
    recipient: {
      name: session.shipping_details?.name || session.customer_details?.name || metadata.name,
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: {
        line1: session.shipping_details?.address?.line1,
        line2: session.shipping_details?.address?.line2 || undefined,
        postalOrZipCode: session.shipping_details?.address?.postal_code,
        countryCode: session.shipping_details?.address?.country,
        townOrCity: session.shipping_details?.address?.city,
        stateOrCounty: session.shipping_details?.address?.state || undefined
      }
    },
    items: [{ merchantReference: session.id, sku: metadata.sku, copies: 1, sizing: "fitPrintArea", attributes: { color: metadata.color, size: metadata.size }, recipientCost: { amount: "39.00", currency: "USD" }, assets: [{ printArea: "front", url: `${metadata.artwork_origin}/api/design?${artParams}` }] }],
    metadata: { stripeSessionId: session.id, design: `${metadata.name} / ${metadata.place} / ${metadata.sign}` }
  };
  try {
    const result = await fetch(`${prodigiBase()}/v4.0/orders`, { method: "POST", headers: { "X-API-Key": prodigiKey, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const response = await result.json();
    if (!result.ok || !["Created", "CreatedWithIssues", "Ok"].includes(response.outcome)) {
      console.error("prodigi_order_error", { status: result.status, response });
      return new Response("Fulfillment submission failed", { status: 500 });
    }
    console.info("prodigi_order_created", { stripeSessionId: session.id, prodigiOrderId: response.order?.id, outcome: response.outcome });
    return Response.json({ received: true, prodigiOrderId: response.order?.id });
  } catch (error) {
    console.error("prodigi_request_error", error);
    return new Response("Fulfillment submission failed", { status: 500 });
  }
}
