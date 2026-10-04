const crypto = require('crypto');

const SECRET = process.env.DESIGN_SECRET || process.env.STRIPE_SECRET_KEY || 'dev-secret';

// Canonical string for a design request
function canonical(params) {
  return ['when', 'lat', 'lon', 'place', 'caption']
    .map((k) => `${k}=${String(params[k] ?? '')}`)
    .join('|');
}

function sign(params) {
  return crypto.createHmac('sha256', SECRET).update(canonical(params)).digest('hex').slice(0, 32);
}

function verify(params, sig) {
  const expected = sign(params);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { sign, verify };
