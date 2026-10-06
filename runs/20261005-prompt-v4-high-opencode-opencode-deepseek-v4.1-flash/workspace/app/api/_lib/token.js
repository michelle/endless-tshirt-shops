'use strict';
const crypto = require('crypto');

function secret() {
  return (
    process.env.ART_SIGNING_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    'under-same-sky-development-signing-key'
  );
}

function sign(obj) {
  const payload = Buffer.from(JSON.stringify(obj)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token) {
  if (typeof token !== 'string' || token.length > 4000) throw new Error('bad token');
  const dot = token.lastIndexOf('.');
  if (dot <= 0) throw new Error('bad token');
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('bad signature');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

module.exports = { sign, verify };
