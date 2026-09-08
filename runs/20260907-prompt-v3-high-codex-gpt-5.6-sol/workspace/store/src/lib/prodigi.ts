import type Stripe from "stripe";
import { sealOrder, siteUrl, type ShirtOrder } from "@/lib/order";

type ShippingDetails = {
  name: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postal_code: string;
    country: string;
  };
};

const sizeMap: Record<ShirtOrder["size"], string> = { S: "s", M: "m", L: "l", XL: "xl", "2XL": "2xl" };

export async function sendPaidOrderToProdigi(session: Stripe.Checkout.Session, order: ShirtOrder) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");

  const currentSession = session as unknown as {
    collected_information?: { shipping_details?: ShippingDetails | null };
    shipping_details?: ShippingDetails | null;
  };
  const shipping = currentSession.collected_information?.shipping_details || currentSession.shipping_details;
  if (!shipping?.address?.line1 || !shipping.address.city || !shipping.address.postal_code || !shipping.address.country) {
    throw new Error("Paid Stripe session is missing a complete shipping address");
  }

  const artworkToken = sealOrder(order);
  const baseUrl = siteUrl();
  const endpoint = `${process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com"}/v4.0/orders`;
  const payload = {
    merchantReference: session.id,
    idempotencyKey: `orbit-one-${session.id}`,
    shippingMethod: "Budget",
    recipient: {
      name: shipping.name || session.customer_details?.name || "Customer",
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
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
      sku: "A-MT-GD64000",
      copies: order.quantity,
      sizing: "fitPrintArea",
      attributes: { color: order.shirtColor, size: sizeMap[order.size] },
      assets: [{ printArea: "default", url: `${baseUrl}/api/artwork?token=${encodeURIComponent(artworkToken)}` }],
    }],
    metadata: { stripeCheckoutSessionId: session.id, concept: "ORBIT_ONE" },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });
  const result = await response.json().catch(() => null) as { outcome?: string; order?: { id?: string }; details?: unknown } | null;
  if (!response.ok || !result?.order?.id) throw new Error(`Prodigi order creation failed (${response.status}): ${JSON.stringify(result?.details || result?.outcome || "Unknown response")}`);
  return result.order.id;
}
