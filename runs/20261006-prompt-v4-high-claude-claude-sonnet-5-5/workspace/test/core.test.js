'use strict';
process.env.SIGNING_SECRET = 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDesign, ValidationError } = require('../src/design/params');
const { renderSvg } = require('../src/design/render');
const { sign, verify, tag, tagOk } = require('../src/sign');
const orders = require('../src/orders');
const catalog = require('../src/catalog');

const design = { name: 'Eleanor Vance', date: '1994-03-14', place: 'Lisbon', message: 'Always look up' };
const recipient = { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+1 415 555 0100', line1: '1 Market St', city: 'San Francisco', state: 'CA', postal: '94105', country: 'US' };
const payload = { items: [{ design, color: 'black', size: 'm', qty: 2 }], recipient };

test('designs are deterministic and vary with the variant', () => {
  const a = renderSvg(normalizeDesign(design), { tone: 'dark' });
  assert.equal(a, renderSvg(normalizeDesign(design), { tone: 'dark' }));
  assert.notEqual(a, renderSvg(normalizeDesign({ ...design, variant: 1 }), { tone: 'dark' }));
  assert.ok(!a.includes('NaN'));
});

test('design input is validated', () => {
  for (const bad of [{ name: '' }, { name: 'x'.repeat(30) }, { name: '<script>' }, { name: 'Ok', date: '1700-01-01' }]) {
    assert.throws(() => normalizeDesign(bad), ValidationError);
  }
});

test('out-of-range variants are clamped', () => {
  assert.equal(normalizeDesign({ name: 'Ok', variant: 500 }).variant, 99);
  assert.equal(normalizeDesign({ name: 'Ok', variant: -4 }).variant, 0);
});

test('signed tokens reject tampering', () => {
  const t = sign({ a: 1 });
  assert.deepEqual(verify(t), { a: 1 });
  const [body, mac] = t.split('.');
  assert.equal(verify(`${Buffer.from('{"a":2}').toString('base64url')}.${mac}`), null);
  assert.equal(verify(`${body}.${mac.slice(0, -2)}xx`), null);
  assert.equal(verify('garbage'), null);
  assert.ok(tagOk('AST-1', tag('AST-1')));
  assert.ok(!tagOk('AST-2', tag('AST-1')));
});

test('order totals are computed server-side from the catalogue', () => {
  const o = orders.buildOrder({ ...payload, items: [{ ...payload.items[0], price: 1, total: 1 }], total: 1 }, 'https://x.test');
  assert.equal(o.subtotal, 2 * catalog.UNIT_PRICE_CENTS);
  assert.equal(o.total, o.subtotal + o.shipping);
  assert.ok(o.shipping > 0);
});

test('orders are rejected for bad quantities, sizes, colours and addresses', () => {
  const bad = (patch) => assert.throws(() => orders.buildOrder({ ...payload, ...patch }, 'https://x.test'), ValidationError);
  bad({ items: [{ ...payload.items[0], qty: 0 }] });
  bad({ items: [{ ...payload.items[0], qty: 999 }] });
  bad({ items: [{ ...payload.items[0], size: 'huge' }] });
  bad({ items: [{ ...payload.items[0], color: 'pink' }] });
  bad({ items: [] });
  bad({ recipient: { ...recipient, email: 'nope' } });
  bad({ recipient: { ...recipient, postal: 'ABC' } });
  bad({ recipient: { ...recipient, country: 'KP' } });
});

test('signed orders expire and cannot be forged', () => {
  const o = orders.buildOrder(payload, 'https://x.test');
  assert.equal(orders.openOrder(orders.signOrder(o)).id, o.id);
  assert.equal(orders.openOrder(orders.signOrder({ ...o, created: Date.now() - 49 * 3600 * 1000 })), null);
  const [body, mac] = orders.signOrder(o).split('.');
  const forged = Buffer.from(JSON.stringify({ ...o, total: 1 })).toString('base64url');
  assert.equal(orders.openOrder(`${forged}.${mac}`), null);
  assert.ok(body);
});
