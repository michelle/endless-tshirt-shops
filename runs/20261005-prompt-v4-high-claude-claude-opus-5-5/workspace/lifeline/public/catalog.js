// Shared catalog + validation. Imported by the browser (designer) and by the
// serverless API (pricing, checkout, fulfilment) so both agree on every rule.
import { METRICS } from './metrics.js';

export const PRODUCT = {
  sku: 'GLOBAL-TEE-BC-3001',
  name: 'Lifeline Tee — Bella+Canvas 3001',
  basePrice: 3600, // cents, USD
  currency: 'usd',
};

// Classic transit-map palette. `text` is the colour of the letter inside a bullet.
export const LINE_COLORS = [
  { id: 'red', name: 'Signal Red', hex: '#EE352E', text: '#FFFFFF' },
  { id: 'orange', name: 'Express Orange', hex: '#FF6319', text: '#FFFFFF' },
  { id: 'yellow', name: 'Crosstown Yellow', hex: '#FCCC0A', text: '#111111' },
  { id: 'lime', name: 'Park Lime', hex: '#6CBE45', text: '#FFFFFF' },
  { id: 'green', name: 'Local Green', hex: '#00933C', text: '#FFFFFF' },
  { id: 'teal', name: 'Harbor Teal', hex: '#00A0A0', text: '#FFFFFF' },
  { id: 'sky', name: 'Airport Sky', hex: '#3FA9F5', text: '#FFFFFF' },
  { id: 'blue', name: 'Uptown Blue', hex: '#0039A6', text: '#FFFFFF' },
  { id: 'purple', name: 'Flushing Purple', hex: '#B933AD', text: '#FFFFFF' },
  { id: 'pink', name: 'Night Owl Pink', hex: '#F05A9E', text: '#FFFFFF' },
  { id: 'brown', name: 'Canal Brown', hex: '#996633', text: '#FFFFFF' },
  { id: 'grey', name: 'Shuttle Grey', hex: '#808183', text: '#FFFFFF' },
];

// `prodigi` is the exact Prodigi colour attribute for GLOBAL-TEE-BC-3001.
// `dark` shirts get white type; light shirts get near-black type.
export const SHIRT_COLORS = [
  { id: 'white', prodigi: 'white', name: 'White', hex: '#F8F8F6', dark: false },
  { id: 'natural', prodigi: 'natural', name: 'Natural', hex: '#EFE7D6', dark: false },
  { id: 'heather', prodigi: 'athletic grey heather', name: 'Athletic Heather', hex: '#C3C3C5', dark: false },
  { id: 'black', prodigi: 'black', name: 'Black', hex: '#1B1B1D', dark: true },
  { id: 'navy', prodigi: 'navy blue', name: 'Navy', hex: '#202B45', dark: true },
  { id: 'asphalt', prodigi: 'asphalt', name: 'Asphalt', hex: '#45474C', dark: true },
  { id: 'army', prodigi: 'army', name: 'Army', hex: '#5F5B45', dark: true },
];

export const SIZES = [
  { id: 'xs', label: 'XS', surcharge: 0 },
  { id: 's', label: 'S', surcharge: 0 },
  { id: 'm', label: 'M', surcharge: 0 },
  { id: 'l', label: 'L', surcharge: 0 },
  { id: 'xl', label: 'XL', surcharge: 0 },
  { id: '2xl', label: '2XL', surcharge: 300 },
  { id: '3xl', label: '3XL', surcharge: 300 },
  { id: '4xl', label: '4XL', surcharge: 300 },
];

export const COUNTRIES = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IE', 'Ireland'],
  ['AU', 'Australia'], ['NZ', 'New Zealand'], ['DE', 'Germany'], ['FR', 'France'],
  ['NL', 'Netherlands'], ['BE', 'Belgium'], ['ES', 'Spain'], ['IT', 'Italy'],
  ['PT', 'Portugal'], ['AT', 'Austria'], ['CH', 'Switzerland'], ['SE', 'Sweden'],
  ['DK', 'Denmark'], ['NO', 'Norway'], ['FI', 'Finland'], ['PL', 'Poland'],
  ['JP', 'Japan'], ['SG', 'Singapore'],
];

export const LIMITS = {
  letter: 2, name: 24, tagline: 34, stopName: 26, stopNote: 18, next: 26,
  minStops: 2, maxStops: 8, maxShirts: 12,
};

export const DEFAULT_DESIGN = {
  letter: 'J',
  name: 'The Jamie Line',
  tagline: 'Local service since 1991',
  color: 'red',
  stops: [
    { name: 'Toledo General', note: 'Born · 1991', transfer: null },
    { name: 'Maple Street', note: 'First bike · 1998', transfer: null },
    { name: 'Ann Arbor', note: 'Class of 2013', transfer: null },
    { name: 'Wicker Park', note: 'Met Sam · 2016', transfer: { letter: 'S', color: 'blue' } },
    { name: 'Denver', note: 'Home · Now', transfer: null },
  ],
  next: 'Wherever’s next',
};

export const lineColor = (id) => LINE_COLORS.find((c) => c.id === id);
export const shirtColor = (id) => SHIRT_COLORS.find((c) => c.id === id);
export const sizeById = (id) => SIZES.find((s) => s.id === id);
export const unitPrice = (sizeId) => PRODUCT.basePrice + (sizeById(sizeId)?.surcharge ?? 0);

const tidy = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

function unsupportedChars(text) {
  const bad = new Set();
  for (const ch of text) if (!(ch in METRICS.bold)) bad.add(ch);
  return [...bad];
}

// Returns { ok, errors: [{field, message}], design } with a normalised copy of the design.
export function validateDesign(input) {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });
  const text = (field, value, max, { required = true } = {}) => {
    const v = tidy(value);
    if (required && !v) err(field, 'Required');
    if ([...v].length > max) err(field, `Keep it to ${max} characters`);
    const bad = unsupportedChars(v);
    if (bad.length) err(field, `Can’t print: ${bad.join(' ')}`);
    return v;
  };

  const d = input && typeof input === 'object' ? input : {};
  const design = {
    letter: text('letter', d.letter, LIMITS.letter).toUpperCase(),
    name: text('name', d.name, LIMITS.name),
    tagline: text('tagline', d.tagline, LIMITS.tagline, { required: false }),
    color: lineColor(d.color) ? d.color : (err('color', 'Pick a line colour'), 'red'),
    stops: [],
    next: text('next', d.next, LIMITS.next, { required: false }),
  };
  if (design.letter && !/^[A-Z0-9]{1,2}$/.test(design.letter)) err('letter', 'Use letters A–Z or digits');

  const stops = Array.isArray(d.stops) ? d.stops : [];
  if (stops.length < LIMITS.minStops) err('stops', `Add at least ${LIMITS.minStops} stops`);
  if (stops.length > LIMITS.maxStops) err('stops', `Maximum ${LIMITS.maxStops} stops`);
  stops.slice(0, LIMITS.maxStops).forEach((s, i) => {
    const stop = {
      name: text(`stops.${i}.name`, s?.name, LIMITS.stopName),
      note: text(`stops.${i}.note`, s?.note, LIMITS.stopNote, { required: false }),
      transfer: null,
    };
    if (s?.transfer && tidy(s.transfer.letter)) {
      const letter = tidy(s.transfer.letter).toUpperCase();
      if (!/^[A-Z0-9]{1,2}$/.test(letter)) err(`stops.${i}.transfer`, 'Transfer bullet: A–Z or digits');
      stop.transfer = { letter, color: lineColor(s.transfer.color) ? s.transfer.color : 'blue' };
    }
    design.stops.push(stop);
  });

  return { ok: errors.length === 0, errors, design };
}

// Validates the shirt choice + size breakdown. items: [{size, qty}]
export function validateOrder({ shirt, items, country }) {
  const errors = [];
  if (!shirtColor(shirt)) errors.push('Unknown shirt colour');
  if (!COUNTRIES.some(([c]) => c === country)) errors.push('We don’t ship to that country yet');
  const clean = [];
  for (const it of Array.isArray(items) ? items : []) {
    const qty = Math.floor(Number(it?.qty));
    if (!sizeById(it?.size)) { errors.push('Unknown size'); continue; }
    if (!(qty >= 1 && qty <= LIMITS.maxShirts)) { errors.push('Bad quantity'); continue; }
    const existing = clean.find((c) => c.size === it.size);
    if (existing) existing.qty += qty; else clean.push({ size: it.size, qty });
  }
  const total = clean.reduce((n, it) => n + it.qty, 0);
  if (total < 1) errors.push('Choose at least one shirt');
  if (total > LIMITS.maxShirts) errors.push(`Maximum ${LIMITS.maxShirts} shirts per order`);
  return { ok: errors.length === 0, errors, items: clean, total };
}
