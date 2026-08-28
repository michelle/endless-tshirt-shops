const PRODIGI_BASE = process.env.PRODIGI_ENV === "live" ? "https://api.prodigi.com/v4.0" : "https://api.sandbox.prodigi.com/v4.0";
const SKU = "GLOBAL-TEE-BC-3001";

export async function createProdigiOrder(session) {
  if (!process.env.PRODIGI_API_KEY) throw new Error("PRODIGI_API_KEY is not configured");
  const metadata = session.metadata || {};
  const shipping = session.shipping_details;
  if (!shipping?.address) throw new Error("Stripe session did not include a shipping address");
  const address = shipping.address;
  const appUrl = process.env.APP_URL || "";
  const artworkUrl = `${appUrl}/api/artwork?ts=${encodeURIComponent(metadata.timestamp || Date.now())}`;
  const payload = {
    merchantReference: session.id,
    idempotencyKey: `datetime-${session.id}`,
    shippingMethod: "Budget",
    recipient: {
      name: shipping.name || session.customer_details?.name || "datetime.store customer",
      email: session.customer_details?.email,
      address: { line1: address.line1, line2: address.line2 || undefined, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || undefined },
    },
    items: [{ sku: SKU, copies: 1, sizing: "fitPrintArea", attributes: { color: "black", size: String(metadata.size || "M").toLowerCase() }, assets: [{ printArea: "front", url: artworkUrl }] }],
    metadata: { stripeSessionId: session.id, product: "the-now-tee", style: metadata.style || "fitted", timestamp: metadata.timestamp || String(Date.now()) },
  };
  const response = await fetch(`${PRODIGI_BASE}/Orders`, { method: "POST", headers: { "X-API-Key": process.env.PRODIGI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
  const result = await response.json();
  if (!response.ok || result.outcome === "Failed") throw new Error(`Prodigi rejected order: ${JSON.stringify(result)}`);
  return result.order || result;
}
