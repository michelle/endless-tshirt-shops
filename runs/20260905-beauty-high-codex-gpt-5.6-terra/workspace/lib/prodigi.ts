import type { Moment } from "./artwork";

export const PRODUCT_SKU = "GLOBAL-TEE-BC-3001";

type Recipient = {
  name: string; email: string;
  address: { line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string };
};

export async function createProdigiOrder({ reference, recipient, moment, size, color, assetUrl, callbackUrl }: {
  reference: string; recipient: Recipient; moment: Moment; size: string; color: string; assetUrl: string; callbackUrl: string;
}) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");
  const baseUrl = process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";
  const payload = {
    merchantReference: reference,
    idempotencyKey: reference,
    callbackUrl,
    shippingMethod: "standard",
    recipient: {
      name: recipient.name,
      email: recipient.email,
      address: { line1: recipient.address.line1, line2: recipient.address.line2 || undefined, townOrCity: recipient.address.city, stateOrCounty: recipient.address.state, postalOrZipCode: recipient.address.postalCode, countryCode: recipient.address.country },
    },
    items: [{ sku: PRODUCT_SKU, copies: 1, sizing: "fitPrintArea", attributes: { color, size }, assets: [{ printArea: "front", url: assetUrl }] }],
    metadata: { capturedAt: moment.iso, unixMilliseconds: moment.ms, timeZone: moment.tz, source: "datetime.store" },
  };
  const response = await fetch(`${baseUrl}/orders`, { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": apiKey }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !["Created", "CreatedWithIssues"].includes(body.outcome)) throw new Error(body?.message || body?.error || "Prodigi could not accept this order");
  return body;
}
