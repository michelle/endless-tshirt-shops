import type Stripe from "stripe";
import { catalog, isProductId, isShirtSize, PRODIGI_SKU } from "@/lib/catalog";

export type FulfillmentResult = {
  prodigiOrderId: string;
  outcome: string;
  productName: string;
  size: string;
};

export async function fulfillPaidSession(session: Stripe.Checkout.Session): Promise<FulfillmentResult> {
  if (session.payment_status !== "paid") throw new Error("Payment has not completed");

  const productId = session.metadata?.product_id;
  const size = session.metadata?.size;
  if (!isProductId(productId) || !isShirtSize(size)) throw new Error("Order details are invalid");

  const shipping = session.collected_information?.shipping_details;
  const email = session.customer_details?.email;
  const phone = session.customer_details?.phone;
  if (!shipping?.address || !shipping.name || !email) throw new Error("Shipping details are incomplete");

  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("Prodigi is not configured");

  const product = catalog[productId];
  const assetBaseUrl = session.metadata?.asset_base_url;
  if (!assetBaseUrl?.startsWith("https://")) throw new Error("Print asset URL is invalid");

  const response = await fetch("https://api.sandbox.prodigi.com/v4.0/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      merchantReference: `STATUS-${session.id.slice(-12)}`,
      idempotencyKey: session.id,
      shippingMethod: "Budget",
      recipient: {
        name: shipping.name,
        email,
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
        merchantReference: productId,
        sku: PRODIGI_SKU,
        copies: 1,
        sizing: "fitPrintArea",
        recipientCost: { amount: "32.00", currency: "USD" },
        attributes: { color: product.color, size },
        assets: [{ printArea: "front", url: `${assetBaseUrl}/prints/${product.printFile}` }],
      }],
      metadata: { stripeCheckoutSessionId: session.id, store: "STATUS/WEAR" },
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as { outcome?: string; order?: { id?: string }; description?: string };
  if (!response.ok || !data.order?.id) throw new Error(data.description || `Prodigi returned ${response.status}`);

  return { prodigiOrderId: data.order.id, outcome: data.outcome || "Created", productName: product.name, size: size.toUpperCase() };
}
