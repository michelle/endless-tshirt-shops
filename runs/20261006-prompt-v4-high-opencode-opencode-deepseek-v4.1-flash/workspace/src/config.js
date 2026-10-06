// Runtime configuration. Reads from the process environment, then falls back
// to a local .env file so the app can be started with a single command.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const RUNTIME_DIR = path.join(ROOT, 'runtime');

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

export const CONFIG = {
  port: Number(process.env.PORT || 8788),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  prodigiApiKey: process.env.PRODIGI_API_KEY || '',
  prodigiBase: process.env.PRODIGI_BASE || 'https://api.sandbox.prodigi.com/v4.0',
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  shippingMethod: process.env.PRODIGI_SHIPPING_METHOD || 'Standard',
  sku: process.env.PRODIGI_SKU || 'GLOBAL-TEE-BC-3001',
  priceCents: Number(process.env.PRICE_CENTS || 3400),
  currency: 'usd',
  adminKey: process.env.ADMIN_KEY || 'echoform-admin',
};

export function ensureDirs() {
  for (const d of [DATA_DIR, RUNTIME_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}
