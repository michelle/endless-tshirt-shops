import { PRODUCT, SHIRT_COLORS } from './catalog.js';

export class ProdigiError extends Error {
  constructor(message, { status, body, retryable }) {
    super(message);
    this.status = status;
    this.body = body;
    this.retryable = retryable;
  }
}

const BLOCKED_COUNTRIES = new Set(['CU', 'IR', 'KP', 'SY', 'RU', 'BY', 'UM', 'AQ']);

export function createProdigi({ baseUrl, apiKey, shippingMethod = 'Standard', fetchImpl = fetch }) {
  async function call(method, pathname, body) {
    let res;
    try {
      res = await fetchImpl(`${baseUrl}${pathname}`, {
        method,
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(25000),
      });
    } catch (e) {
      throw new ProdigiError(`Prodigi unreachable: ${e.message}`, { retryable: true });
    }
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      throw new ProdigiError(`Prodigi ${method} ${pathname} -> ${res.status}: ${JSON.stringify(json).slice(0, 600)}`, {
        status: res.status,
        body: json,
        retryable: res.status >= 500 || res.status === 429,
      });
    }
    return json;
  }

  let shipsToCache = null;
  async function shippableCountries() {
    if (shipsToCache && Date.now() - shipsToCache.at < 6 * 3600e3) return shipsToCache.list;
    const { product } = await call('GET', `/products/${PRODUCT.sku}`);
    const set = new Set();
    for (const v of product.variants) for (const c of v.shipsTo) set.add(c);
    const list = [...set].filter((c) => !BLOCKED_COUNTRIES.has(c)).sort();
    shipsToCache = { at: Date.now(), list };
    return list;
  }

  const lineItem = (item) => ({
    sku: PRODUCT.sku,
    copies: item.qty,
    attributes: { color: SHIRT_COLORS[item.color].prodigi, size: item.size },
  });

  const quoteCache = new Map();
  // Returns Prodigi's cost for the whole cart (USD cents) for the configured shipping method.
  async function quote(items, countryCode) {
    const key = JSON.stringify([items.map((i) => [i.color, i.size, i.qty]), countryCode]);
    const hit = quoteCache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60e3) return hit.value;
    const res = await call('POST', '/quotes', {
      shippingMethod,
      destinationCountryCode: countryCode,
      currencyCode: 'USD',
      items: items.map((i) => ({ ...lineItem(i), assets: [{ printArea: PRODUCT.printArea }] })),
    });
    const q = res.quotes?.[0];
    if (!q) throw new ProdigiError('No shipping quote available for this destination', { status: 422, body: res, retryable: false });
    const cents = (m) => {
      if (m.currency !== 'USD') throw new ProdigiError(`Unexpected quote currency ${m.currency}`, { retryable: false });
      return Math.round(parseFloat(m.amount) * 100);
    };
    const value = {
      shippingCostCents: cents(q.costSummary.shipping),
      itemsCostCents: cents(q.costSummary.items),
      taxCents: cents(q.costSummary.totalTax),
    };
    if (quoteCache.size > 500) quoteCache.clear();
    quoteCache.set(key, { at: Date.now(), value });
    return value;
  }

  async function findByMerchantReference(ref) {
    const res = await call('GET', `/orders?merchantReferences=${encodeURIComponent(ref)}&top=5`);
    return (res.orders || []).find((o) => o.merchantReference === ref) || null;
  }

  async function createOrder(order, assetUrlFor) {
    const r = order.recipient;
    return call('POST', '/orders', {
      merchantReference: order.id,
      idempotencyKey: order.id,
      shippingMethod,
      recipient: {
        name: r.name,
        email: order.email,
        phoneNumber: r.phone || undefined,
        address: {
          line1: r.line1,
          line2: r.line2 || undefined,
          postalOrZipCode: r.postalCode,
          countryCode: r.country,
          townOrCity: r.city,
          stateOrCounty: r.state || undefined,
        },
      },
      items: order.items.map((item, idx) => ({
        merchantReference: `${order.id}-${idx + 1}`,
        ...lineItem(item),
        sizing: 'fillPrintArea',
        assets: [{ printArea: PRODUCT.printArea, url: assetUrlFor(idx) }],
      })),
    });
  }

  const getOrder = (id) => call('GET', `/orders/${encodeURIComponent(id)}`);

  return { shippableCountries, quote, createOrder, findByMerchantReference, getOrder };
}
