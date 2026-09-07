import { required, isSandbox } from './config';
import { productItem, type Selection } from './catalog';
export type ProdigiOrder = {
  id: string;
  status?: {
    stage: string;
    issues?: unknown[];
    details?: Record<string, string>;
  };
  shipments?: { tracking?: { url?: string; number?: string } }[];
  items?: { assets?: { status?: string; url?: string }[] }[];
};
export async function prodigi<T>(route: string, body?: unknown): Promise<T> {
  const base = isSandbox()
    ? 'https://api.sandbox.prodigi.com/v4.0'
    : 'https://api.prodigi.com/v4.0';
  const response = await fetch(base + route, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-API-Key': required('PRODIGI_API_KEY'),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      `Prodigi request failed (${response.status}, ${String(data.outcome || 'unknown')})`,
    );
  return data as T;
}
export async function quote(selection: Selection) {
  const d = await prodigi<{
    outcome: string;
    quotes?: { costSummary: unknown }[];
  }>('/quotes', {
    shippingMethod: 'Standard',
    destinationCountryCode: 'US',
    currencyCode: 'USD',
    items: [productItem(selection)],
  });
  if (!d.quotes?.length)
    throw new Error(
      'This size is temporarily unavailable. Please try another size.',
    );
  return d.quotes[0];
}
