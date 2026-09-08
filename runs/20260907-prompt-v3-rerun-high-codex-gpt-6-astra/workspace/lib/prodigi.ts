import { SKU, type Design } from "./design";
export async function prodigi(path: string, body?: unknown) {
  if (!process.env.PRODIGI_API_KEY)
    throw new Error("Print provider not configured");
  const host =
    process.env.PRODIGI_MODE === "live"
      ? "https://api.prodigi.com"
      : "https://api.sandbox.prodigi.com";
  const response = await fetch(host + "/v4.0/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "X-API-Key": process.env.PRODIGI_API_KEY,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error("Print provider request failed (" + response.status + ")");
  return data;
}
export function item(design: Design, url?: string) {
  return {
    sku: SKU,
    copies: 1,
    sizing: "fitPrintArea",
    attributes: { color: "white", size: design.size },
    assets: [{ printArea: "front", ...(url ? { url } : {}) }],
  };
}
export async function verifyQuote(design: Design) {
  const data = await prodigi("quotes", {
    shippingMethod: "Standard",
    destinationCountryCode: "US",
    currencyCode: "USD",
    items: [item(design)],
  });
  if (!data.quotes?.length)
    throw new Error(
      "This shirt is temporarily unavailable. Please try again later.",
    );
  return data;
}
