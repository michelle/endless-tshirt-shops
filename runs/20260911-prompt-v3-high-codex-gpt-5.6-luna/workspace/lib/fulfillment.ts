import { decodeDesign, encodeDesign, sanitizeDesign, type Design } from "./design";

const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";

type StripeSession = {
  id: string;
  payment_status: string;
  customer_details?: { email?: string | null } | null;
  shipping_details?: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  } | null;
  metadata?: Record<string, string>;
};

export async function getStripeSession(sessionId: string): Promise<StripeSession> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured");
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`, {
    headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}` },
    cache: "no-store"
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Unable to verify Stripe session");
  return body as StripeSession;
}

export async function fulfillStripeSession(sessionId: string, origin: string) {
  const session = await getStripeSession(sessionId);
  if (session.payment_status !== "paid") throw new Error("Payment has not succeeded; fulfillment was not released.");
  const metadata = session.metadata ?? {};
  const design = decodeDesign(metadata.design);
  const address = session.shipping_details?.address;
  if (!session.shipping_details?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error("A complete shipping address is required before fulfillment.");
  }
  const order = await createProdigiOrder({
    idempotencyKey: `stripe_${session.id}`,
    merchantReference: `PATCHWORK-${session.id.slice(-12).toUpperCase()}`,
    email: session.customer_details?.email ?? undefined,
    design,
    origin,
    recipient: {
      name: session.shipping_details.name,
      address: {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        townOrCity: address.city,
        stateOrCounty: address.state ?? undefined,
        postalOrZipCode: address.postal_code,
        countryCode: address.country
      }
    }
  });
  return { order, sessionId: session.id, design };
}

export async function createDemoFulfillment(input: { design: Partial<Design>; origin: string; email?: string; recipient: { name: string; address: Record<string, string> } }) {
  const design = sanitizeDesign(input.design);
  return createProdigiOrder({
    idempotencyKey: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    merchantReference: `PATCHWORK-DEMO-${Date.now().toString(36).toUpperCase()}`,
    email: input.email,
    design,
    origin: input.origin,
    recipient: input.recipient
  });
}

async function createProdigiOrder(input: { idempotencyKey: string; merchantReference: string; email?: string; design: Design; origin: string; recipient: { name: string; address: Record<string, string | undefined> } }) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");
  const baseUrl = process.env.PRODIGI_ENVIRONMENT === "live" ? "https://api.prodigi.com" : "https://api.sandbox.prodigi.com";
  const assetUrl = `${input.origin}/api/artwork?design=${encodeDesign(input.design)}`;
  const response = await fetch(`${baseUrl}/v4.0/orders`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantReference: input.merchantReference,
      idempotencyKey: input.idempotencyKey,
      shippingMethod: "Standard",
      recipient: {
        name: input.recipient.name,
        email: input.email,
        address: input.recipient.address
      },
      items: [{
        sku: PRODIGI_SKU,
        copies: input.design.quantity,
        sizing: "fillPrintArea",
        attributes: { color: input.design.shirtColor, size: input.design.size.toLowerCase() },
        assets: [{ printArea: "front", url: assetUrl }]
      }],
      metadata: { designName: input.design.name, designVibe: input.design.vibe, source: "patchwork-signal-goods" }
    })
  });
  const body = await response.json();
  if (!response.ok || body?.outcome === "Failed") throw new Error(body?.issues?.[0]?.description || body?.message || "Prodigi order creation failed");
  return body?.order ?? body;
}
