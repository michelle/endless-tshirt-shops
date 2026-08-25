const PRODIGI_BASE = process.env.PRODIGI_ENV === 'live' ? 'https://api.prodigi.com/v4.0' : 'https://api.sandbox.prodigi.com/v4.0';

export async function fulfillPaymentIntent(stripe, intent, artworkOrigin) {
  if (intent.metadata?.prodigi_order_id) return { orderId: intent.metadata.prodigi_order_id };
  const { style, size, timestamp } = intent.metadata || {};
  const recipient = intent.shipping;
  if (!style || !size || !timestamp || !recipient?.address) throw new Error('Shipping details are missing from this payment.');
  const artworkUrl = `${artworkOrigin}/api/artwork?stamp=${encodeURIComponent(timestamp)}&style=${encodeURIComponent(style)}`;
  const payload = {
    merchantReference: `datetime-${intent.id}`,
    idempotencyKey: `datetime-store-${intent.id}`,
    shippingMethod: 'Budget',
    recipient: { name: recipient.name, email: intent.receipt_email, address: { line1: recipient.address.line1, line2: recipient.address.line2, postalOrZipCode: recipient.address.postal_code, countryCode: recipient.address.country, townOrCity: recipient.address.city, stateOrCounty: recipient.address.state } },
    items: [{ merchantReference: `tee-${intent.id}`, sku: 'GLOBAL-TEE-BC-3001', copies: 1, sizing: 'fitPrintArea', attributes: { color: 'black', size: size.toLowerCase() }, recipientCost: { amount: '22.50', currency: 'USD' }, assets: [{ printArea: 'front', url: artworkUrl }] }],
    metadata: { paymentIntentId: intent.id, style, size, printedTimestamp: timestamp },
  };
  const response = await fetch(`${PRODIGI_BASE}/Orders`, { method: 'POST', headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok || !data.order?.id) {
    console.error('prodigi-order', response.status, data);
    throw new Error('Prodigi rejected the order.');
  }
  await stripe.paymentIntents.update(intent.id, { metadata: { ...intent.metadata, prodigi_order_id: data.order.id } });
  return { orderId: data.order.id };
}
