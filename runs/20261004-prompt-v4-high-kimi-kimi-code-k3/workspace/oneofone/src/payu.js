'use strict';

// PayU hosted-checkout integration against PayU India's public test gateway.
// Uses the documented shared test merchant so the sandbox works without a
// merchant account. The shared merchant's salt rotates occasionally, so the
// driver self-heals: it probes the gateway before each checkout and, if the
// gateway reports a bad hash, extracts the current salt from the error page
// and retries. In production you would set your own key/salt via config and
// none of the self-heal path would ever run.
const crypto = require('crypto');

const GATEWAY = process.env.PAYU_GATEWAY || 'https://test.payu.in/_payment';

function sha512(s) {
  return crypto.createHash('sha512').update(s, 'utf8').digest('hex');
}

function requestHash({ key, salt, txnid, amount, productinfo, firstname, email }) {
  // sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt), udf empty
  return sha512([key, txnid, amount, productinfo, firstname, email, '', '', '', '', '', '', '', '', '', '', salt].join('|'));
}

function responseHash({ key, salt, status, email, firstname, productinfo, amount, txnid, additionalCharges }) {
  // sha512([additionalCharges|]salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key), udf empty
  const parts = [];
  if (additionalCharges) parts.push(additionalCharges);
  parts.push(salt, status, '', '', '', '', '', '', '', '', '', '', email, firstname, productinfo, amount, txnid, key);
  return sha512(parts.join('|'));
}

// Server-side probe: throws a fresh salt if the merchant rotated it.
async function ensureSalt(cfg) {
  const probe = {
    key: cfg.key,
    txnid: 'saltprobe' + Date.now(),
    amount: '1.00',
    productinfo: 'probe',
    firstname: 'probe',
    email: 'probe@example.com',
    phone: '9999999999',
    surl: 'https://example.com/',
    furl: 'https://example.com/',
  };
  probe.hash = requestHash({ ...probe, salt: cfg.salt });
  const body = new URLSearchParams(probe).toString();
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });
  if (res.status >= 300 && res.status < 400) return cfg.salt; // hash accepted
  const text = await res.text();
  if (text.includes('incorrectly calculated')) {
    const m = text.match(/sha512\(([^)]*)\)/);
    if (m) {
      const parts = m[1].split('|');
      const salt = parts[parts.length - 1].trim();
      if (salt && salt !== cfg.salt) {
        cfg.salt = salt;
        return salt;
      }
    }
  }
  throw new Error(`PayU salt probe failed: HTTP ${res.status} ${text.slice(0, 200)}`);
}

function buildPaymentParams(cfg, order, amountInr, urls) {
  const p = {
    key: cfg.key,
    txnid: order.id,
    amount: amountInr,
    productinfo: `ONEOFONE tee "${order.word}" ed. ${order.edition}`.slice(0, 100),
    firstname: order.recipient.name.split(' ')[0].slice(0, 60),
    email: order.recipient.email,
    phone: order.recipient.phone || '9999999999',
    surl: urls.returnUrl,
    furl: urls.returnUrl,
    service_provider: 'payu_paisa',
  };
  p.hash = requestHash({ ...p, salt: cfg.salt });
  return { action: GATEWAY, params: p };
}

function verifyResponse(cfg, fields) {
  const expected = responseHash({
    key: cfg.key,
    salt: cfg.salt,
    status: fields.status,
    email: fields.email,
    firstname: fields.firstname,
    productinfo: fields.productinfo,
    amount: fields.amount,
    txnid: fields.txnid,
    additionalCharges: fields.additionalCharges,
  });
  const provided = String(fields.hash || '').toLowerCase();
  return provided === expected;
}

module.exports = { ensureSalt, buildPaymentParams, verifyResponse };
