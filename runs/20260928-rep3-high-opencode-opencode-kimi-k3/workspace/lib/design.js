// Product catalogue + pricing, shared by client and server.
export const PRODUCT = {
  sku: 'GLOBAL-TEE-BC-3001',
  name: 'Bella + Canvas 3001',
  label: 'The Star Map Tee',
};

export const SHIRT_COLORS = [
  { id: 'black', label: 'Black', hex: '#1b1c20', ink: 'dark' },
  { id: 'navy blue', label: 'Navy', hex: '#232c47', ink: 'dark' },
  { id: 'asphalt', label: 'Asphalt', hex: '#53575d', ink: 'dark' },
  { id: 'military green', label: 'Military Green', hex: '#676a52', ink: 'dark' },
  { id: 'cream', label: 'Cream', hex: '#efe7d3', ink: 'light' },
  { id: 'white', label: 'White', hex: '#f3f2ee', ink: 'light' },
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export const BASE_PRICE_CENTS = 3400; // $34.00

// Flat shipping by destination (Standard service)
export function shippingCents(countryCode) {
  const cc = (countryCode || '').toUpperCase();
  if (cc === 'US') return 490;
  if (cc === 'CA') return 650;
  if (cc === 'GB') return 690;
  const EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','NO','CH','IS'];
  if (EU.includes(cc)) return 690;
  return 890;
}

export function money(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function colorById(id) {
  return SHIRT_COLORS.find((c) => c.id === id) || null;
}
