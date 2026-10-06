'use strict';
const catalog = require('./catalog');

const COUNTRIES = [
  'US','CA','GB','IE','AU','NZ','DE','FR','ES','IT','NL','BE','AT','PT','SE',
  'NO','DK','FI','CH','PL','CZ','GR','HU','RO','JP','SG','HK','KR','TW','MY',
  'MX','BR','ZA','AE','IL','IN','ID','PH','TH','VN',
];

function clean(s, max) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function validDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function validTime(s) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s || ''));
  return !!m;
}

// Validate the customer's design inputs and return a compact, signed-ready spec.
function validateDesign(body) {
  const errors = [];
  const c = clean(body.caption, 70);
  const n = clean(body.names, 40);
  const d = String(body.date || '').trim();
  const t = String(body.time || '').trim();
  const p = clean(body.place, 55);
  const la = Number(body.lat);
  const lo = Number(body.lon);
  const o = Math.round(Number(body.offsetMinutes));
  const color = catalog.color(String(body.color || ''));
  const size = catalog.size(String(body.size || ''));

  if (!c) errors.push('Please add a caption.');
  if (!validDate(d)) errors.push('Please choose a valid date.');
  if (!validTime(t)) errors.push('Please choose a valid time.');
  if (!p) errors.push('Please choose a place.');
  if (!Number.isFinite(la) || la < -90 || la > 90) errors.push('Latitude is invalid.');
  if (!Number.isFinite(lo) || lo < -180 || lo > 180) errors.push('Longitude is invalid.');
  if (!Number.isFinite(o) || o < -840 || o > 840) errors.push('Time zone is invalid.');
  if (!color) errors.push('Please choose a shirt colour.');
  if (!size) errors.push('Please choose a size.');

  if (errors.length) return { ok: false, errors };
  const spec = { c, n, d, t, p, la: +la.toFixed(4), lo: +lo.toFixed(4), o, k: color.tone };
  return { ok: true, spec, color, size };
}

// Build the Prodigi order payload. Called only after payment is verified.
function buildProdigiOrder({ spec, token, color, size, sessionId, recipient, origin }) {
  const addr = recipient.address || {};
  return {
    merchantReference: sessionId,
    idempotencyKey: sessionId,
    shippingMethod: 'Standard',
    recipient: {
      name: recipient.name || 'Customer',
      email: recipient.email || undefined,
      phoneNumber: recipient.phone || undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        townOrCity: addr.city || addr.townOrCity,
        stateOrCounty: addr.state || addr.stateOrCounty || undefined,
        postalOrZipCode: addr.postal_code || addr.postalOrZipCode,
        countryCode: addr.country || addr.countryCode,
      },
    },
    items: [
      {
        merchantReference: 'tee-1',
        sku: catalog.PRODUCT.sku,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { color: color.id, size: size.id },
        assets: [
          {
            printArea: 'front',
            url: `${origin}/api/design?t=${encodeURIComponent(token)}`,
          },
        ],
      },
    ],
    metadata: { store: 'under-same-sky', stripeSession: sessionId, caption: spec.c },
  };
}

module.exports = { COUNTRIES, clean, validDate, validTime, validateDesign, buildProdigiOrder };
