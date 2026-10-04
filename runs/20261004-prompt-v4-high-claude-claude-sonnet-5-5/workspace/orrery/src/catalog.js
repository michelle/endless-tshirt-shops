import { parseDate, MIN_DATE, MAX_DATE } from './astro.js';

export const PRODUCT = {
  sku: 'GLOBAL-TEE-GIL-64000',
  title: 'The Orrery Tee',
  priceCents: 3800,
  currency: 'usd',
  printArea: 'front',
  printWidth: 4665,
  printHeight: 5844,
  maxQtyPerLine: 10,
  maxLines: 10,
};

// tone = which ink set is used on this garment
export const SHIRT_COLORS = {
  black: { label: 'Black', prodigi: 'black', hex: '#141414', tone: 'dark' },
  navy: { label: 'Navy', prodigi: 'navy blue', hex: '#1d2a47', tone: 'dark' },
  forest: { label: 'Forest', prodigi: 'forest green', hex: '#1f3b2d', tone: 'dark' },
  maroon: { label: 'Maroon', prodigi: 'maroon', hex: '#5b1f2e', tone: 'dark' },
  sand: { label: 'Sand', prodigi: 'sand', hex: '#d9c9a8', tone: 'light' },
  white: { label: 'White', prodigi: 'white', hex: '#f5f4f0', tone: 'light' },
};

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];

export const INKS = {
  dark: { main: '#f4eee2', solar: '#f5b942', ember: '#ff6b5b', glacier: '#78d5ec' },
  light: { main: '#14213d', solar: '#d98200', ember: '#d03a28', glacier: '#1b78ad' },
};
export const ACCENTS = { solar: 'Solar', ember: 'Ember', glacier: 'Glacier' };

const ALLOWED_TEXT = /^[\p{Script=Latin}\p{N} .,'’&!?:;·•\-–—/@#()+%]*$/u;

function cleanText(s, max) {
  const t = String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if ([...t].length > max) return { error: `Keep it to ${max} characters or fewer.` };
  if (!ALLOWED_TEXT.test(t)) return { error: 'Please use Latin letters, numbers and basic punctuation only.' };
  return { value: t };
}

// Validates a customer-supplied line item and returns a canonical, safe copy.
export function normalizeItem(raw) {
  const errors = {};
  const out = {};
  if (!parseDate(raw?.date)) errors.date = `Choose a date between ${MIN_DATE.slice(0, 4)} and ${MAX_DATE.slice(0, 4)}.`;
  else out.date = raw.date;

  const name = cleanText(raw?.name, 24);
  if (name.error) errors.name = name.error;
  else if (!name.value) errors.name = 'Add a name to put on the shirt.';
  else out.name = name.value;

  const line = cleanText(raw?.line, 40);
  if (line.error) errors.line = line.error;
  else out.line = line.value;

  if (!SHIRT_COLORS[raw?.color]) errors.color = 'Pick a shirt colour.';
  else out.color = raw.color;
  if (!ACCENTS[raw?.accent]) errors.accent = 'Pick an ink accent.';
  else out.accent = raw.accent;
  if (!SIZES.includes(raw?.size)) errors.size = 'Pick a size.';
  else out.size = raw.size;

  const qty = Number(raw?.qty ?? 1);
  if (!Number.isInteger(qty) || qty < 1 || qty > PRODUCT.maxQtyPerLine) errors.qty = `Quantity must be 1-${PRODUCT.maxQtyPerLine}.`;
  else out.qty = qty;

  return Object.keys(errors).length ? { errors } : { item: out };
}
