// Prodigi Print API client (sandbox by default).
// Docs: https://www.prodigi.com/print-api/docs/reference/
const PRODIGI_BASE = process.env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com';
const API_KEY = process.env.PRODIGI_API_KEY;

function headers() {
  if (!API_KEY) throw new Error('PRODIGI_API_KEY is not set');
  return { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' };
}

async function request(method, urlPath, body) {
  const res = await fetch(`${PRODIGI_BASE}${urlPath}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) { /* non-JSON body */ }
  return { status: res.status, json, text };
}

/**
 * Quote price + shipping for a destination without creating an order.
 * @param {string} countryCode  ISO-3166 alpha-2
 * @param {Array} items  [{sku, copies, attributes, assets:[{printArea}]}]
 * @param {string} shippingMethod Budget|Standard|StandardPlus|Express|Overnight
 */
async function quote(countryCode, items, shippingMethod) {
  const { status, json } = await request('POST', '/v4.0/quotes', {
    shippingMethod,
    destinationCountryCode: countryCode,
    currencyCode: 'USD',
    items,
  });
  if (status !== 200 || !json || json.outcome !== 'Ok') {
    // 'CreatedWithIssues' still returns usable quotes when assets are absent
    if (!json || !json.quotes || !json.quotes.length) {
      throw new Error(`Prodigi quote failed (${status}): ${json?.outcome || 'unknown'}`);
    }
  }
  const q = json.quotes.find((x) => x.shipmentMethod.toLowerCase() === String(shippingMethod).toLowerCase()) || json.quotes[0];
  return {
    itemsCost: parseFloat(q.costSummary.items.amount),
    shippingCost: parseFloat(q.costSummary.shipping.amount),
    totalCost: parseFloat(q.costSummary.totalCost?.amount ?? '0'),
    currency: q.costSummary.items.currency,
    fulfillmentCountry: q.shipments?.[0]?.fulfillmentLocation?.countryCode ?? null,
    carrier: q.shipments?.[0]?.carrier?.name ?? null,
  };
}

/**
 * Create (submit) an order. Only call after payment has succeeded.
 * The idempotencyKey prevents double-fulfillment on retries.
 */
async function createOrder(payload) {
  return request('POST', '/v4.0/orders', payload);
}

async function getOrder(prodigiOrderId) {
  return request('GET', `/v4.0/orders/${encodeURIComponent(prodigiOrderId)}`);
}

module.exports = { quote, createOrder, getOrder, PRODIGI_BASE, isConfigured: () => Boolean(API_KEY) };
