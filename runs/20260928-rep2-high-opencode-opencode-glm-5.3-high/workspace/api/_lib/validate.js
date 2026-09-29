// Server-side validation for every order. Nothing from the client is
// trusted: prices come from config.js, every field is checked against a
// whitelist or clamped, and the print file must be a PNG hosted in this
// project's own blob store (verified against it by HEAD at checkout).

import {
  THEMES,
  GARMENT_COLORS,
  SIZES,
  QUANTITY_LIMIT,
  priceCents,
  SHIPPABLE_COUNTRIES,
} from './config.js';

const BLOB_PRINT_URL = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/prints\/[a-f0-9-]+\.png$/;
const ISO_WALL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_MIN = '1901-01-01';
const DATE_MAX = '2099-12-31';
// Printable ASCII, plus-addressing included; good enough for Stripe metadata
// and the Prodigi recipient record.
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export class OrderError extends Error {
  constructor(message, field = null) {
    super(message);
    this.field = field;
  }
}

function clean(value, field, { min = 1, max = 100 }) {
  if (typeof value !== 'string') throw new OrderError(`${field} is required`, field);
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length < min || trimmed.length > max) {
    throw new OrderError(`${field} must be ${min}-${max} characters`, field);
  }
  // Reject control characters and anything that could smuggle markup.
  if (!/^[\p{L}\p{M}\p{N}\p{P}\p{Z}]+$/u.test(trimmed)) {
    throw new OrderError(`${field} contains unsupported characters`, field);
  }
  return trimmed;
}

function booleanFlag(value, field) {
  if (typeof value !== 'boolean') {
    if (value === 1 || value === 0) return Boolean(value);
    throw new OrderError(`${field} must be true or false`, field);
  }
  return value;
}

function numberInRange(value, field, lo, hi) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi) {
    throw new OrderError(`${field} must be a number between ${lo} and ${hi}`, field);
  }
  return value;
}

function validTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Validates the whole checkout body; returns a normalized order ready to
// price and send. Throws OrderError with a client-usable message.
export function validateCheckout(body) {
  if (!body || typeof body !== 'object') throw new OrderError('missing order body');
  const { design, garment, address, print } = body;

  // ---- design (the sky) -----------------------------------------------
  if (!design || typeof design !== 'object') throw new OrderError('missing design', 'design');
  const wallISO = design.wallISO;
  if (typeof wallISO !== 'string' || !ISO_WALL_TIME.test(wallISO)) {
    throw new OrderError('date must look like 1991-06-14T23:42', 'date');
  }
  const datePart = wallISO.slice(0, 10);
  if (datePart < DATE_MIN || datePart > DATE_MAX) {
    throw new OrderError('date must be between 1901 and 2099', 'date');
  }
  if (typeof design.timezone !== 'string' || !validTimeZone(design.timezone)) {
    throw new OrderError('unknown timezone', 'place');
  }
  const lat = numberInRange(design.lat, 'latitude', -90, 90);
  const lng = numberInRange(design.lng, 'longitude', -180, 180);
  const title = clean(design.title, 'title', { min: 1, max: 40 });
  const placeLabel = clean(design.placeLabel, 'place label', { min: 1, max: 60 });
  const theme = THEMES.find((t) => t.id === design.theme);
  if (!theme) throw new OrderError('unknown theme', 'theme');
  const showMoon = booleanFlag(design.showMoon, 'moon');
  const showLines = booleanFlag(design.showLines, 'constellation lines');

  // ---- garment --------------------------------------------------------
  if (!garment || typeof garment !== 'object') throw new OrderError('missing garment', 'size');
  const color = GARMENT_COLORS.find((c) => c.id === garment.color);
  if (!color) throw new OrderError('unknown shirt color', 'color');
  const size = SIZES.find((s) => s.id === garment.size);
  if (!size) throw new OrderError('unknown shirt size', 'size');
  const quantity = Math.min(
    Math.max(Number(garment.quantity) | 0, 1),
    QUANTITY_LIMIT,
  );
  if (!Number.isFinite(Number(garment.quantity)) || Number(garment.quantity) < 1) {
    throw new OrderError('quantity must be 1-5', 'quantity');
  }

  // ---- shipping address ----------------------------------------------
  if (!address || typeof address !== 'object') throw new OrderError('missing address', 'name');
  const name = clean(address.name, 'name', { min: 2, max: 60 });
  const line1 = clean(address.line1, 'address line 1', { min: 2, max: 60 });
  const line2 =
    address.line2 && String(address.line2).trim()
      ? clean(address.line2, 'address line 2', { min: 1, max: 40 })
      : '';
  const city = clean(address.city, 'city', { min: 1, max: 40 });
  const state = clean(address.state, 'state/region', { min: 0, max: 30 });
  const zip = clean(address.zip, 'postal code', { min: 2, max: 12 });
  const country = String(address.country || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new OrderError('country must be 2 letters', 'country');
  if (!SHIPPABLE_COUNTRIES.includes(country)) {
    throw new OrderError(`we don't ship to ${country} yet`, 'country');
  }
  const email = String(address.email || '').trim().toLowerCase().slice(0, 80);
  if (!EMAIL.test(email)) throw new OrderError('that email looks wrong', 'email');

  // ---- print file ------------------------------------------------------
  if (typeof print !== 'string' || !BLOB_PRINT_URL.test(print)) {
    throw new OrderError('print file URL is invalid', 'print');
  }

  const amounts = priceCents({ sizeId: size.id, quantity, countryCode: country });

  return {
    design: { lat, lng, wallISO, timezone: design.timezone, title, placeLabel, theme: theme.id, showMoon, showLines },
    garment: { color: color.id, size: size.id, quantity },
    address: { name, line1, line2, city, state, zip, country, email },
    print,
    amounts,
  };
}

// Rehydrate an order from Stripe metadata (written at checkout) so
// fulfillment trusts exactly what was paid for, never a new payload.
export function orderFromMetadata(metadata) {
  const parse = (key) => {
    const value = metadata?.[key];
    if (typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };
  const design = parse('ns_spec');
  const garment = parse('ns_garment');
  const address = parse('ns_address');
  const print = metadata?.ns_print;
  if (!design || !garment || !address || typeof print !== 'string') return null;
  return { design, garment, address, print };
}

// Compact re-serialization for the metadata keys (each Stripe metadata
// value must stay under 500 characters).
export function toMetadata(order) {
  const { design, garment, address, print, amounts } = order;
  const spec = JSON.stringify({
    lat: +design.lat.toFixed(4),
    lng: +design.lng.toFixed(4),
    tz: design.timezone,
    t: design.wallISO,
    ti: design.title,
    pl: design.placeLabel,
    th: design.theme,
    m: design.showMoon ? 1 : 0,
    l: design.showLines ? 1 : 0,
  });
  const ship = JSON.stringify({
    name: address.name,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
  });
  for (const [label, value] of [
    ['spec', spec],
    ['address', ship],
  ]) {
    if (value.length > 480) throw new OrderError(`${label} too long for order metadata`);
  }
  return {
    ns_version: '1',
    ns_spec: spec,
    ns_garment: JSON.stringify({ c: garment.color, s: garment.size, q: garment.quantity }),
    ns_address: ship,
    ns_print: print,
    ns_amounts: JSON.stringify({
      unit: amounts.unitCents,
      subtotal: amounts.subtotalCents,
      shipping: amounts.shippingCents,
      total: amounts.totalCents,
    }),
  };
}
