'use strict';
const crypto = require('crypto');
const { signingSecret } = require('./config');

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function mac(data) {
  return crypto.createHmac('sha256', signingSecret).update(data).digest('base64url');
}

function sign(obj) {
  const body = b64(JSON.stringify(obj));
  return `${body}.${mac(body)}`;
}

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function verify(token) {
  if (typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i);
  if (!safeEqual(token.slice(i + 1), mac(body))) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
}

// Short signature for a plain string (used for order status links).
const tag = (s) => mac(`tag:${s}`).slice(0, 22);
const tagOk = (s, t) => typeof t === 'string' && safeEqual(t, tag(s));

module.exports = { sign, verify, tag, tagOk };
