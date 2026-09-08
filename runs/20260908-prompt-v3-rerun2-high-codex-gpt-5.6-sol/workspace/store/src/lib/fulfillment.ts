import "server-only";
import { stripeClient } from "./stripe";

const SKU = "GLOBAL-TEE-BC-3001";

export async function fulfillCheckoutSession(sessionId: string) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { state: "waiting" as const };

  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const artworkToken = session.metadata?.artworkToken;
  const size = session.metadata?.size;
  const color = session.metadata?.color;
  if (!shipping?.name || !address || !address.line1 || !address.city || !address.postal_code || !address.country || !artworkToken || !size || !color) {
    throw new Error(`Paid session ${sessionId} is missing fulfillment details.`);
  }

  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("Prodigi is not configured.");
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not configured.");
  const environment = process.env.PRODIGI_ENV === "live" ? "https://api.prodigi.com" : "https://api.sandbox.prodigi.com";
  const response = await fetch(`${environment}/v4.0/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey: session.id,
      shippingMethod: "Budget",
      recipient: {
        name: shipping.name,
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address: {
          line1: address.line1,
          line2: address.line2 ?? undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state ?? undefined,
        },
      },
      items: [{
        merchantReference: session.id,
        sku: SKU,
        copies: 1,
        sizing: "fitPrintArea",
        recipientCost: { amount: "42.00", currency: "USD" },
        attributes: { brand: "Bella + Canvas", edge: "Crew neck", color, gender: "Unisex", paperType: "100% cotton", size, style: "3001" },
        assets: [{ printArea: "front", url: `${appUrl}/api/artwork/${artworkToken}` }],
      }],
      metadata: { stripeSessionId: session.id, collection: "signal-atlas" },
    }),
  });
  const result = await response.json().catch(() => ({}));
  const outcome = typeof result.outcome === "string" ? result.outcome.toLowerCase() : "";
  const accepted = new Set(["created", "createdwithissues", "onhold", "alreadyexists"]);
  if (!response.ok || !accepted.has(outcome)) throw new Error(`Prodigi rejected fulfillment (${response.status}).`);
  return { state: "submitted" as const, orderId: result.order?.id as string | undefined };
}
