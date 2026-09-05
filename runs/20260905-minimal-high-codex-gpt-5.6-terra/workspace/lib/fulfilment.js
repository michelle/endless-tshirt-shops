const products = {
  fitted: { sku: 'GLOBAL-TEE-BC-6004', printArea: 'front', attributes: { color: 'black' } },
  unisex: { sku: 'A-MT-GD64000', printArea: 'default', attributes: { color: 'black' } }
};

export function normalizeAddress(address) {
  if (!address || !['name', 'line1', 'city', 'postalCode', 'countryCode'].every((field) => String(address[field] || '').trim()) || !/^[A-Z]{2}$/.test(address.countryCode)) return null;
  return { name: address.name.trim(), line1: address.line1.trim(), line2: address.line2?.trim() || undefined, city: address.city.trim(), state: address.state?.trim() || undefined, postalCode: address.postalCode.trim(), countryCode: address.countryCode };
}

export function stripeShipping(address) {
  const normalized = normalizeAddress(address);
  if (!normalized) return null;
  return { name: normalized.name, address: { line1: normalized.line1, line2: normalized.line2, city: normalized.city, state: normalized.state, postal_code: normalized.postalCode, country: normalized.countryCode } };
}

export async function createProdigiOrder({ payment, address, origin }) {
  const normalized = normalizeAddress(address);
  const product = products[payment.metadata.style];
  if (!normalized || !product) throw new Error('Order data is incomplete.');
  const size = String(payment.metadata.size || '').toLowerCase();
  const reference = `datetime-${payment.id}`;
  const artwork = `${origin}/api/artwork?timestamp=${encodeURIComponent(payment.metadata.capturedAt)}`;
  const order = {
    merchantReference: reference, idempotencyKey: payment.id, shippingMethod: 'Standard',
    recipient: { name: normalized.name, email: payment.receipt_email || undefined, address: { line1: normalized.line1, line2: normalized.line2, postalOrZipCode: normalized.postalCode, townOrCity: normalized.city, stateOrCounty: normalized.state, countryCode: normalized.countryCode } },
    items: [{ merchantReference: reference, sku: product.sku, copies: 1, sizing: 'fitPrintArea', attributes: { ...product.attributes, size }, assets: [{ printArea: product.printArea, url: artwork }] }]
  };
  const apiBase = process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com';
  const response = await fetch(`${apiBase}/v4.0/Orders`, { method: 'POST', headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
  const payload = await response.json().catch(() => ({}));
  // Prodigi honors our PaymentIntent ID as an idempotency key. A webhook and
  // the browser can race; "AlreadyExists" means the earlier request won.
  if (response.ok && payload.outcome === 'AlreadyExists') {
    return { orderId: payload.order?.id || reference, status: payload.order?.status?.stage || 'InProgress' };
  }
  if (!response.ok || !['Created', 'CreatedWithIssues'].includes(payload.outcome)) {
    console.error('Prodigi order failed', response.status, payload.outcome);
    throw new Error(payload?.issues?.[0]?.description || 'Your payment succeeded, but print fulfilment could not be created. Please contact support with your payment ID.');
  }
  return { orderId: payload.order?.id, status: payload.order?.status?.stage || 'InProgress' };
}
