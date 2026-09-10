import "server-only";
import type Stripe from "stripe";
import { PRODUCT, customizationSchema } from "@/lib/product";
import { getStripe } from "@/lib/stripe";

type ShippingDetails = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    country?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
};

function shippingFrom(session: Stripe.Checkout.Session): ShippingDetails | undefined {
  const value = session as unknown as {
    shipping_details?: ShippingDetails | null;
    collected_information?: { shipping_details?: ShippingDetails | null } | null;
  };
  return value.collected_information?.shipping_details ?? value.shipping_details ?? undefined;
}

export async function fulfillPaidSession(sessionId: string, siteOrigin: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { status: "waiting_for_payment" as const };

  const metadata = session.metadata ?? {};
  const customization = customizationSchema.parse({
    phrase: metadata.phrase,
    detail: metadata.detail,
    palette: metadata.palette,
    garment: metadata.garment,
    size: metadata.size,
    quantity: Number(metadata.quantity ?? 1),
  });
  const artworkToken = metadata.artwork_token;
  if (!artworkToken) throw new Error("Paid session is missing its artwork token");

  const shipping = shippingFrom(session);
  const address = shipping?.address ?? session.customer_details?.address;
  if (!address?.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error("Paid session is missing a complete shipping address");
  }

  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");
  const baseUrl = process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";
  const artworkUrl = `${siteOrigin}/api/artwork?token=${encodeURIComponent(artworkToken)}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/orders`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey: session.id,
      shippingMethod: "Budget",
      recipient: {
        name: shipping?.name || session.customer_details?.name || "Signal / Self customer",
        email: session.customer_details?.email || undefined,
        phoneNumber: session.customer_details?.phone || undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || undefined,
        },
      },
      items: [{
        merchantReference: `${session.id}-shirt`,
        sku: PRODUCT.sku,
        copies: customization.quantity,
        sizing: "fitPrintArea",
        attributes: { color: customization.garment, size: customization.size.toLowerCase() },
        recipientCost: {
          amount: ((PRODUCT.unitAmount * customization.quantity) / 100).toFixed(2),
          currency: PRODUCT.currency.toUpperCase(),
        },
        assets: [{ printArea: "front", url: artworkUrl }],
      }],
      metadata: {
        stripeCheckoutSession: session.id,
        personalization: `${customization.phrase} / ${customization.detail}`,
      },
    }),
  });

  const result = await response.json() as { outcome?: string; order?: { id?: string }; issues?: unknown };
  if (!response.ok || !["Created", "CreatedWithIssues", "AlreadyExists"].includes(result.outcome ?? "")) {
    throw new Error(`Prodigi rejected the order (${response.status}, ${result.outcome ?? "unknown"})`);
  }
  return { status: "fulfilled" as const, prodigiOrderId: result.order?.id, outcome: result.outcome };
}
