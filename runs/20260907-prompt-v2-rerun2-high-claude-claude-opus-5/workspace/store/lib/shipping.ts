import { SKU, CURRENCY } from "./catalog";
import { getQuotes, type ShippingMethod, type QuoteItem } from "./prodigi";
import type { PricedLine } from "./cart";
export { SHIPPING_METHODS } from "./shipping-methods";

export const toQuoteItems = (lines: PricedLine[]): QuoteItem[] =>
  lines.map((l) => ({
    sku: SKU,
    copies: l.qty,
    attributes: { color: l.color, size: l.size },
    assets: [{ printArea: "front" }],
  }));

const cents = (s?: string) => Math.round(Number(s ?? "0") * 100);

/**
 * Prodigi's quote endpoint takes 3–4s. Shipping for a given basket/destination
 * doesn't move minute to minute, so warm instances reuse it briefly — this keeps
 * the checkout summary responsive and avoids re-quoting on submit.
 */
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; shippingCents: number; available: boolean }>();

const cacheKey = (lines: PricedLine[], country: string, method: string) =>
  [country, method, ...lines.map((l) => `${l.color}/${l.size}x${l.qty}`).sort()].join("|");

/**
 * Prodigi quotes production + carrier cost. We pass the carrier cost through at
 * cost and keep the margin in the shirt price.
 */
export async function shippingCentsFor(
  lines: PricedLine[],
  countryCode: string,
  method: ShippingMethod,
): Promise<{ shippingCents: number; available: boolean }> {
  const k = cacheKey(lines, countryCode, method);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { shippingCents: hit.shippingCents, available: hit.available };

  const quotes = await getQuotes({
    destinationCountryCode: countryCode,
    currencyCode: CURRENCY,
    items: toQuoteItems(lines),
    shippingMethod: method,
  });
  const q = quotes.find((x) => x.shipmentMethod?.toLowerCase() === method.toLowerCase()) ?? quotes[0];
  const result = q
    ? { shippingCents: cents(q.costSummary?.shipping?.amount), available: true }
    : { shippingCents: 0, available: false };

  if (cache.size > 500) cache.clear();
  cache.set(k, { at: Date.now(), ...result });
  return result;
}
