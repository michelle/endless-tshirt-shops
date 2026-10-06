'use strict';

// The one product we print: Bella + Canvas 3001 unisex tee, printed DTG.
const PRODUCT = {
  sku: 'GLOBAL-TEE-BC-3001',
  name: 'Bella + Canvas 3001 Unisex Tee',
  frontPrint: { width: 4677, height: 5881 },
};

// Colors offered, with a tone used to pick a legible ink palette.
const COLORS = [
  { id: 'black', name: 'Black', hex: '#111111', tone: 'dark' },
  { id: 'navy blue', name: 'Navy Blue', hex: '#1f2a44', tone: 'dark' },
  { id: 'dark heather grey', name: 'Dark Heather Grey', hex: '#3b3f45', tone: 'dark' },
  { id: 'maroon', name: 'Maroon', hex: '#4a1f28', tone: 'dark' },
  { id: 'military green', name: 'Military Green', hex: '#3d4a34', tone: 'dark' },
  { id: 'royal blue', name: 'Royal Blue', hex: '#1f3d8a', tone: 'dark' },
  { id: 'athletic grey heather', name: 'Athletic Grey Heather', hex: '#b8bcc0', tone: 'light' },
  { id: 'white', name: 'White', hex: '#f4f4f0', tone: 'light' },
  { id: 'cream', name: 'Cream', hex: '#efe7d4', tone: 'light' },
];

const SIZES = [
  { id: 'xs', name: 'XS', add: 0 },
  { id: 's', name: 'S', add: 0 },
  { id: 'm', name: 'M', add: 0 },
  { id: 'l', name: 'L', add: 0 },
  { id: 'xl', name: 'XL', add: 0 },
  { id: '2xl', name: '2XL', add: 200 },
  { id: '3xl', name: '3XL', add: 300 },
  { id: '4xl', name: '4XL', add: 500 },
];

const BASE_PRICE = 3600; // $36.00
const SHIPPING = 600; // $6.00 flat

function color(id) {
  return COLORS.find((c) => c.id === id) || null;
}
function size(id) {
  return SIZES.find((s) => s.id === id) || null;
}

function priceFor(sizeId) {
  const s = size(sizeId);
  if (!s) return null;
  return { subtotal: BASE_PRICE + s.add, shipping: SHIPPING, total: BASE_PRICE + s.add + SHIPPING };
}

module.exports = { PRODUCT, COLORS, SIZES, BASE_PRICE, SHIPPING, color, size, priceFor };
