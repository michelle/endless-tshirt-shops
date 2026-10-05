'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.env.PORT || '8080', 10);

// The tunnel supervisor rewrites this file whenever the public URL changes.
const PUBLIC_URL_FILE = process.env.PUBLIC_URL_FILE || path.join(ROOT, 'data', 'public_url.txt');

function publicBase() {
  try {
    const u = fs.readFileSync(PUBLIC_URL_FILE, 'utf8').trim().replace(/\/+$/, '');
    if (/^https?:\/\//.test(u)) return u;
  } catch { /* not deployed yet */ }
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  return `http://localhost:${PORT}`;
}

const config = {
  ROOT,
  PORT,
  PUBLIC_URL_FILE,
  publicBase,

  prodigi: {
    apiKey: process.env.PRODIGI_API_KEY || '',
    baseUrl: process.env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0',
    sku: process.env.PRODIGI_SKU || 'GLOBAL-TEE-BC-3001',
    printArea: 'front',
    sizing: 'fitPrintArea',
    shippingMethod: 'Standard',
    // Recommended pixel size of the front print area at 300 dpi (15.6 x 19.3 in).
    printWidth: 4680,
    printHeight: 5790,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    get enabled() { return /^sk_(test|live)_/.test(this.secretKey); },
  },

  pricing: {
    currency: 'usd',
    unitAmount: 3400,   // cents
    shippingAmount: 600, // cents, flat
  },

  product: {
    name: 'NightLoom Signature Tee',
    brand: 'Bella + Canvas 3001',
    sizes: ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'],
    colors: [
      { id: 'black', label: 'Black', hex: '#111111', bestWith: ['midnight', 'obsidian', 'dusk'] },
      { id: 'navy blue', label: 'Navy', hex: '#1d2a44', bestWith: ['obsidian', 'ivory'] },
      { id: 'white', label: 'White', hex: '#f5f4f0', bestWith: ['midnight', 'dusk', 'ivory'] },
      { id: 'cream', label: 'Cream', hex: '#efe6d3', bestWith: ['midnight', 'ivory'] },
      { id: 'dark heather grey', label: 'Heather Grey', hex: '#4a4d52', bestWith: ['midnight', 'obsidian', 'ivory'] },
      { id: 'burgundy', label: 'Burgundy', hex: '#5a2233', bestWith: ['ivory', 'obsidian'] },
      { id: 'army', label: 'Army', hex: '#4c5138', bestWith: ['ivory', 'obsidian'] },
      { id: 'royal blue', label: 'Royal Blue', hex: '#2a45a0', bestWith: ['ivory'] },
    ],
  },

  palettes: ['midnight', 'obsidian', 'dusk', 'ivory'],

  countries: [
    'US', 'CA', 'GB', 'IE', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
    'PL', 'CZ', 'HU', 'PT', 'GR', 'IS', 'LU', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'RO', 'BG',
    'AU', 'NZ', 'JP', 'SG',
  ],
};

module.exports = config;
