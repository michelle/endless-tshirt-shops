const Stripe = require('stripe');

const PRODUCTS = {
  fitted: 'next-level-boyfriend-tee',
  unisex: 'next-level-fitted-crew',
};
const SIZES = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' };

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

function validOptions(style, size) {
  return ['fitted', 'unisex'].includes(style) && Object.prototype.hasOwnProperty.call(SIZES, size);
}

function siteUrl(req) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function spAuthHeader() {
  if (!process.env.SP_AUTH) throw new Error('SP_AUTH is not configured.');
  return `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString('base64')}`;
}

async function spRequest(path, options = {}) {
  const response = await fetch(`https://api.scalablepress.com/v2/${path}`, {
    ...options,
    headers: { Authorization: spAuthHeader(), ...(options.headers || {}) },
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Scalable Press returned ${response.status}.`);
    error.providerBody = body;
    error.statusCode = response.status;
    throw error;
  }
  return body;
}

async function createDesign(artwork) {
  const encoded = artwork.split(',')[1];
  const bytes = Buffer.from(encoded, 'base64');
  const form = new FormData();
  form.append('type', 'dtg');
  form.append('sides[front][artwork]', new Blob([bytes], { type: 'image/png' }), 'artwork.png');
  form.append('sides[front][dimensions][width]', '8');
  form.append('sides[front][position][horizontal]', 'C');
  form.append('sides[front][position][offset][top]', '3');
  const result = await spRequest('design', { method: 'POST', body: form });
  if (!result.designId) throw new Error('Scalable Press did not return a design ID.');
  return result.designId;
}

async function quote({ style, size, designId, address }) {
  const form = new URLSearchParams({
    type: 'dtg',
    'products[0][id]': PRODUCTS[style],
    'products[0][color]': 'Black',
    'products[0][quantity]': '1',
    'products[0][size]': SIZES[size],
    designId,
    'address[name]': address.name || '',
    'address[address1]': address.address1 || '',
    'address[address2]': address.address2 || '',
    'address[city]': address.city || '',
    'address[state]': address.state || '',
    'address[zip]': address.zip || '',
    'address[country]': address.country || 'US',
  });
  return spRequest('quote', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
}

async function createSpOrder(orderToken) {
  return spRequest('order', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ orderToken }) });
}

module.exports = { PRODUCTS, SIZES, stripeClient, json, validOptions, siteUrl, createDesign, quote, createSpOrder };
