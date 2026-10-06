import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const RUNTIME_DIR = path.join(ROOT, 'runtime');
export const ASSETS_DIR = path.join(ROOT, 'assets');

// Load .env if present
function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  }

  // Also check BENCHMARK_CLI_STATE if STRIPE_SECRET_KEY is not set
  if (!process.env.STRIPE_SECRET_KEY && process.env.BENCHMARK_CLI_STATE && fs.existsSync(process.env.BENCHMARK_CLI_STATE)) {
    const toml = fs.readFileSync(process.env.BENCHMARK_CLI_STATE, 'utf8');
    const skMatch = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/);
    const pkMatch = toml.match(/test_mode_pub_key\s*=\s*['"]([^'"]+)['"]/);
    if (skMatch) process.env.STRIPE_SECRET_KEY = skMatch[1];
    if (pkMatch) process.env.STRIPE_PUBLISHABLE_KEY = pkMatch[1];
  }
}

loadEnvFile();

export const CONFIG = {
  port: Number(process.env.PORT || 8788),
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  prodigiApiKey: process.env.PRODIGI_API_KEY || '',
  prodigiBase: (process.env.PRODIGI_BASE || 'https://api.sandbox.prodigi.com/v4.0').replace(/\/$/, ''),
  sku: process.env.PRODIGI_SKU || 'GLOBAL-TEE-BC-3001',
  priceCents: Number(process.env.PRICE_CENTS || 3400), // $34.00 flat
  currency: 'usd',
  adminKey: process.env.ADMIN_KEY || 'astro-admin-secret-2026',
};

export function ensureDirs() {
  for (const dir of [DATA_DIR, RUNTIME_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
