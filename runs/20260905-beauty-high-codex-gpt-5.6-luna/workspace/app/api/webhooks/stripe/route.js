import Stripe from "stripe";

const PRODIGI_URL = "https://api.sandbox.prodigi.com/v4.0/Orders";
const SKU_BY_STYLE = { fitted: "GLOBAL-TEE-BC-3003", unisex: "GLOBAL-TEE-BC-3001" };

async function createProdigiOrder(session) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  const { style = "fitted", size = "M", timestamp } = session.metadata || {};
  const customer = session.customer_details || {};
  const address = customer.address || {};
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");

  const response = await fetch(PRODIGI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify({
      merchantReference: `datetime-${session.id}`,
      shippingMethod: "Budget",
      recipient: {
        name: customer.name || "datetime customer",
        email: customer.email || undefined,
        address: {
          line1: address.line1 || "",
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code || "",
          countryCode: address.country || "US",
          townOrCity: address.city || "",
          stateOrCounty: address.state || undefined,
        },
      },
      items: [{
        sku: SKU_BY_STYLE[style] || SKU_BY_STYLE.fitted,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: "black", size: size.toLowerCase() },
        assets: [{ printArea: "front", url: `${baseUrl}/api/artwork?timestamp=${encodeURIComponent(timestamp || new Date().toISOString())}&style=${style}` }],
      }],
      metadata: { stripeSessionId: session.id, timestamp: timestamp || "" },
    }),
  });
  const payload = await response.json();
  if (!response.ok || ["BadRequest", "Error"].includes(payload.outcome)) throw new Error(`Prodigi order failed: ${JSON.stringify(payload)}`);
  console.log("prodigi_order_created", payload.order?.id || payload.id || payload.outcome);
  return payload;
}

export async function POST(request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return new Response("Webhook is not configured", { status: 503 });
  const stripe = new Stripe(secret);
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    try {
      await createProdigiOrder(event.data.object);
    } catch (error) {
      console.error("prodigi_fulfillment_error", error);
      return new Response("Fulfillment failed; retry webhook", { status: 500 });
    }
  }
  return Response.json({ received: true });
}
