'use strict';
// Test-mode payment provider used until Stripe keys are configured.
// It mimics Stripe's test cards and never moves real money.
const crypto = require('crypto');

const CARDS = {
  '4242424242424242': { ok: true },
  '4000000000000002': { ok: false, message: 'Your card was declined.' },
  '4000000000009995': { ok: false, message: 'Your card has insufficient funds.' },
  '4000000000000069': { ok: false, message: 'Your card has expired.' },
};

function createCheckout(order, token) {
  return { redirectUrl: `${order.origin}/pay-demo.html?o=${encodeURIComponent(token)}` };
}

function charge(card = {}) {
  const num = String(card.number || '').replace(/\D/g, '');
  const known = CARDS[num];
  if (!known) return { ok: false, message: 'This is a test checkout. Use card 4242 4242 4242 4242, any future expiry and any CVC.' };
  const m = /^(\d{1,2})\s*\/\s*(\d{2,4})$/.exec(String(card.exp || '').trim());
  if (!m) return { ok: false, message: 'Enter the expiry as MM/YY.' };
  const year = m[2].length === 2 ? 2000 + +m[2] : +m[2];
  const exp = new Date(year, +m[1], 1);
  if (+m[1] < 1 || +m[1] > 12 || exp <= new Date()) return { ok: false, message: 'Your card has expired.' };
  if (!/^\d{3,4}$/.test(String(card.cvc || ''))) return { ok: false, message: 'Enter the 3-digit security code.' };
  if (!known.ok) return known;
  return { ok: true, paymentId: 'demo_' + crypto.randomBytes(8).toString('hex') };
}

module.exports = { createCheckout, charge };
