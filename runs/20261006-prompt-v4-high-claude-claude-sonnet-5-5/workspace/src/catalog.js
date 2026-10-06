'use strict';

const SKU = 'GLOBAL-TEE-BC-3001';
const UNIT_PRICE_CENTS = 3600;
const MAX_QTY_PER_LINE = 10;
const MAX_LINES = 8;

// tone = fabric lightness, used to choose print inks that read well on that colour.
const COLORS = [
  { id: 'black', label: 'Black', hex: '#16171b', tone: 'dark' },
  { id: 'navy blue', label: 'Navy', hex: '#1f2a47', tone: 'dark' },
  { id: 'dark heather grey', label: 'Charcoal', hex: '#3d4048', tone: 'dark', heather: true },
  { id: 'maroon', label: 'Maroon', hex: '#5a1a2c', tone: 'dark' },
  { id: 'white', label: 'White', hex: '#f5f4f0', tone: 'light' },
  { id: 'natural', label: 'Natural', hex: '#e8dfc9', tone: 'light' },
];

const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];

// Shipping in USD cents: [first shirt, each additional shirt]. Set from Prodigi Standard quotes plus margin.
const COUNTRIES = {
  US: { name: 'United States', ship: [595, 250], needsState: true },
  CA: { name: 'Canada', ship: [1999, 700], needsState: true },
  GB: { name: 'United Kingdom', ship: [499, 200] },
  IE: { name: 'Ireland', ship: [799, 300] },
  DE: { name: 'Germany', ship: [799, 300] },
  FR: { name: 'France', ship: [799, 300] },
  NL: { name: 'Netherlands', ship: [799, 300] },
  ES: { name: 'Spain', ship: [799, 300] },
  IT: { name: 'Italy', ship: [799, 300] },
  BE: { name: 'Belgium', ship: [799, 300] },
  AT: { name: 'Austria', ship: [799, 300] },
  SE: { name: 'Sweden', ship: [799, 300] },
  DK: { name: 'Denmark', ship: [799, 300] },
  FI: { name: 'Finland', ship: [799, 300] },
  PT: { name: 'Portugal', ship: [799, 300] },
  PL: { name: 'Poland', ship: [799, 300] },
  AU: { name: 'Australia', ship: [1499, 600], needsState: true },
  NZ: { name: 'New Zealand', ship: [1599, 600] },
};

const colorById = (id) => COLORS.find((c) => c.id === id);

function shippingCents(country, totalUnits) {
  const c = COUNTRIES[country];
  if (!c) return null;
  return c.ship[0] + c.ship[1] * Math.max(0, totalUnits - 1);
}

module.exports = { SKU, UNIT_PRICE_CENTS, MAX_QTY_PER_LINE, MAX_LINES, COLORS, SIZES, COUNTRIES, colorById, shippingCents };
