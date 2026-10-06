// Minimal Prodigi Print API v4 client (sandbox by default).

export const PRODIGI_BASE = {
  sandbox: 'https://api.sandbox.prodigi.com/v4.0',
  live: 'https://api.prodigi.com/v4.0',
};

export class ProdigiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status || 502;
    this.body = body;
  }
}

function client(apiKey, env) {
  const base = PRODIGI_BASE[env === 'live' ? 'live' : 'sandbox'];
  async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'X-API-Key': apiKey,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    let json;
    try { json = await res.json(); } catch { json = {}; }
    if (!res.ok) {
      const msg = json?.error?.message || json?.detail || `Prodigi ${method} ${path} → HTTP ${res.status}`;
      throw new ProdigiError(msg, res.status, json);
    }
    return json;
  }
  return {
    quote: (params) => call('POST', '/Quotes', params),
    createOrder: (params) => call('POST', '/Orders', params),
    getOrder: (id) => call('GET', `/Orders/${encodeURIComponent(id)}`),
    listOrders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return call('GET', `/Orders${qs ? `?${qs}` : ''}`);
    },
  };
}

export function createProdigiApi(apiKey, env = 'sandbox') {
  return client(apiKey, env);
}

// Shipping quotes for an item, by shipment method.
// item: { sku, copies, attributes: {size, color} }
export async function shippingQuote(prodigi, { destinationCountryCode, currencyCode = 'USD', item }) {
  const res = await prodigi.quote({
    destinationCountryCode,
    currencyCode,
    items: [{ ...item, assets: [{ printArea: 'front' }] }],
  });
  if (!res.quotes?.length) {
    throw new ProdigiError(res.issues?.[0]?.description || 'no shipping quotes for this destination', 400, res);
  }
  return res.quotes.map((q) => ({
    method: q.shipmentMethod,
    itemsCost: q.costSummary?.items,
    shippingCost: q.costSummary?.shipping,
    totalCost: q.costSummary?.totalCost,
    carrier: q.shipments?.[0]?.carrier,
  }));
}
