'use strict';
const crypto = require('crypto');
const { normalizeDesign, ValidationError } = require('./design/params');
const catalog = require('./catalog');
const { sign, verify } = require('./sign');

const clip = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

function validateRecipient(r = {}) {
  const country = clip(r.country, 2).toUpperCase();
  const c = catalog.COUNTRIES[country];
  if (!c) throw new ValidationError('Sorry, we do not ship to that country yet.', 'country');
  const out = {
    name: clip(r.name, 80),
    email: clip(r.email, 120).toLowerCase(),
    phone: clip(r.phone, 24),
    line1: clip(r.line1, 80),
    line2: clip(r.line2, 80),
    city: clip(r.city, 60),
    state: clip(r.state, 40),
    postal: clip(r.postal, 12).toUpperCase(),
    country,
  };
  if (out.name.length < 2) throw new ValidationError('Please enter the recipient name.', 'name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) throw new ValidationError('Please enter a valid email address.', 'email');
  if (!/^\+?[\d\s().-]{7,20}$/.test(out.phone)) throw new ValidationError('Please enter a phone number (couriers require it).', 'phone');
  if (out.line1.length < 3) throw new ValidationError('Please enter a street address.', 'line1');
  if (out.city.length < 2) throw new ValidationError('Please enter a city.', 'city');
  if (c.needsState && out.state.length < 2) throw new ValidationError('Please enter a state / province.', 'state');
  const postalRules = { US: /^\d{5}(-\d{4})?$/, CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, GB: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/, AU: /^\d{4}$/, NZ: /^\d{4}$/ };
  if (!out.postal || (postalRules[country] && !postalRules[country].test(out.postal))) {
    throw new ValidationError('Please check the postal / ZIP code.', 'postal');
  }
  return out;
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new ValidationError('Your cart is empty.', 'items');
  if (items.length > catalog.MAX_LINES) throw new ValidationError('Too many different items in one order.', 'items');
  return items.map((it) => {
    const color = catalog.colorById(it && it.color);
    if (!color) throw new ValidationError('Please choose a shirt colour.', 'color');
    if (!catalog.SIZES.includes(it.size)) throw new ValidationError('Please choose a size.', 'size');
    const qty = parseInt(it.qty, 10);
    if (!(qty >= 1 && qty <= catalog.MAX_QTY_PER_LINE)) throw new ValidationError('Invalid quantity.', 'qty');
    return { d: normalizeDesign(it.design), c: color.id, s: it.size, q: qty };
  });
}

function totals(items, country) {
  const units = items.reduce((n, i) => n + i.q, 0);
  const subtotal = units * catalog.UNIT_PRICE_CENTS;
  const shipping = catalog.shippingCents(country, units);
  return { units, subtotal, shipping, total: subtotal + shipping };
}

function quote(payload) {
  const items = validateItems(payload.items);
  const country = clip(payload.country, 2).toUpperCase();
  if (!catalog.COUNTRIES[country]) throw new ValidationError('Sorry, we do not ship to that country yet.', 'country');
  return { items, ...totals(items, country), currency: 'usd' };
}

// Builds the signed, self-contained order that travels through the payment provider.
function buildOrder(payload, origin) {
  const items = validateItems(payload.items);
  const recipient = validateRecipient(payload.recipient);
  const t = totals(items, recipient.country);
  const id = 'AST-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  return { v: 1, id, origin, created: Date.now(), items, recipient, ...t, currency: 'usd' };
}

const ORDER_TTL_MS = 48 * 3600 * 1000;

function openOrder(token) {
  const o = verify(token);
  if (!o || o.v !== 1 || !o.id) return null;
  if (Date.now() - o.created > ORDER_TTL_MS) return null;
  return o;
}

const signOrder = (order) => sign(order);

module.exports = { buildOrder, openOrder, signOrder, quote, validateItems, totals };
