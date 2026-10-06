// Product catalog + pricing for the storefront.
const PRODUCT = {
  sku: 'GLOBAL-TEE-BC-3001', // Bella+Canvas 3001 unisex classic tee, DTG front print
  name: 'Unisex Classic Tee — Bella+Canvas 3001',
  printArea: 'front',
};

const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'];

// Offered colors (subset of the SKU's attribute values) with hexes for mockups.
const COLORS = [
  { id: 'black', name: 'Jet Black', hex: '#1b1b1f', dark: true },
  { id: 'navy blue', name: 'Midnight Navy', hex: '#20293f', dark: true },
  { id: 'dark heather grey', name: 'Storm Grey', hex: '#4b4b52', dark: true },
  { id: 'burgundy', name: 'Oxblood', hex: '#57242f', dark: true },
  { id: 'army', name: 'Deep Forest', hex: '#3f4632', dark: true },
  { id: 'royal blue', name: 'Royal', hex: '#27459c', dark: true },
  { id: 'white', name: 'Moon White', hex: '#f5f3ee', dark: false },
  { id: 'cream', name: 'Bone', hex: '#efe8d8', dark: false },
  { id: 'ash', name: 'Fog', hex: '#cfc9c2', dark: false },
  { id: 'light blue', name: 'Dawn Blue', hex: '#a9c6e8', dark: false },
];

const PRICING = {
  currency: 'USD',
  shirtUnit: 3400,      // cents
  handling: 400,        // cents per order (packing & handling)
  shippingMarkup: 0,    // pass Prodigi's quoted carrier cost through as-is
};

const SHIPPING_METHODS = {
  Standard: { label: 'Standard', eta: '5–10 business days' },
  Express: { label: 'Express', eta: '2–4 business days' },
};

function assertValidItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 6) throw new Error('cart must contain 1-6 shirt lines');
  for (const it of items) {
    if (!SIZES.includes(it.size)) throw new Error(`invalid size: ${it.size}`);
    const color = COLORS.find((c) => c.id === it.color);
    if (!color) throw new Error(`invalid color: ${it.color}`);
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 5) throw new Error('quantity must be 1-5 per line');
  }
  return items.map((it) => ({ size: it.size, color: it.color, qty: Number(it.qty) }));
}

module.exports = { PRODUCT, SIZES, COLORS, PRICING, SHIPPING_METHODS, assertValidItems };
