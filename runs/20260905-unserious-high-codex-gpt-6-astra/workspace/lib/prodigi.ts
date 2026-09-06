import { required, isTestMode } from './server';
import { PRODUCTS, type Moment } from './catalog';
export type ProdigiOrder = { id: string; status: { stage: string; issues: { errorCode: string; description?: string }[]; details?: Record<string, string> }; shipments: { tracking?: { url?: string; number?: string }; carrier?: { name?: string } }[]; items?: { status: string; assets: { status: string }[] }[] };
export async function prodigi<T>(path: string, body?: unknown): Promise<T> {
  const host = isTestMode() ? 'https://api.sandbox.prodigi.com' : 'https://api.prodigi.com';
  const response = await fetch(`${host}/v4.0${path}`, { method: body ? 'POST' : 'GET', headers: { 'X-API-Key': required('PRODIGI_API_KEY'), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) { const error = new Error(`Print service returned ${response.status}`); Object.assign(error, { code: data.outcome, statusCode: response.status }); throw error; }
  return data as T;
}
export function printItem(moment: Moment, artworkUrl?: string) {
  return { sku: PRODUCTS[moment.style].sku, copies: 1, sizing: 'fillPrintArea', attributes: { color: 'black', size: moment.size.toLowerCase() }, assets: [{ printArea: 'front', ...(artworkUrl ? { url: artworkUrl } : {}) }] };
}
export async function quoteShirt(moment: Moment) {
  const result = await prodigi<{ quotes: { items: unknown[]; costSummary: unknown }[]; outcome: string }>('/quotes', { shippingMethod: 'Standard', destinationCountryCode: 'US', currencyCode: 'USD', items: [{ sku: PRODUCTS[moment.style].sku, copies: 1, attributes: { color: 'black', size: moment.size.toLowerCase() }, assets: [{ printArea: 'front' }] }] });
  if (!result.quotes?.length || !result.quotes[0].items?.length) throw new Error('This shirt is unavailable for US shipping');
  return result.quotes[0];
}

// Retail price and US shipping are fixed. Product availability is sufficient
// before Checkout; price quotes are an operator tool, not a payment dependency.
export async function checkProductAvailability(moment: Moment) {
  const host = isTestMode() ? 'https://api.sandbox.prodigi.com' : 'https://api.prodigi.com';
  const response = await fetch(`${host}/v4.0/products/${PRODUCTS[moment.style].sku}`, {
    headers: { 'X-API-Key': required('PRODIGI_API_KEY') },
    next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Product availability check failed');
  const data = await response.json() as { product?: { variants?: { attributes: { color: string; size: string }; shipsTo: string[] }[] } };
  const available = data.product?.variants?.some(variant => variant.attributes.color === 'black' && variant.attributes.size === moment.size.toLowerCase() && variant.shipsTo.includes('US'));
  if (!available) throw new Error('This size is currently unavailable for US delivery');
}
