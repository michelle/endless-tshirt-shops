import crypto from 'node:crypto';

const bool = (v) => ['1', 'true', 'yes', 'on'].includes(String(v ?? '').toLowerCase());

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  const baseUrl = (env.BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');
  const prodigiBaseUrl = (env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com/v4.0').replace(/\/+$/, '');
  const config = {
    port,
    baseUrl,
    dataDir: env.DATA_DIR || './data',
    prodigiApiKey: env.PRODIGI_API_KEY || '',
    prodigiBaseUrl,
    prodigiIsSandbox: prodigiBaseUrl.includes('sandbox'),
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    demoPayments: bool(env.DEMO_PAYMENTS),
    adminToken: env.ADMIN_TOKEN || '',
    shippingMethod: env.SHIPPING_METHOD || 'Standard',
    isProduction: env.NODE_ENV === 'production',
    trustProxy: env.TRUST_PROXY ?? '1',
  };
  config.stripeEnabled = Boolean(config.stripeSecretKey);
  config.stripeIsTestMode = config.stripeSecretKey.startsWith('sk_test_') || config.stripeSecretKey.startsWith('rk_test_');

  if (!config.prodigiApiKey) throw new Error('PRODIGI_API_KEY is required');
  if (config.stripeEnabled && !config.stripeWebhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set');
  if (config.demoPayments && config.stripeEnabled) throw new Error('DEMO_PAYMENTS cannot be combined with STRIPE_SECRET_KEY');
  // Demo payments mark orders paid without taking money, so they must never reach real printing.
  if (config.demoPayments && !config.prodigiIsSandbox) throw new Error('DEMO_PAYMENTS is only allowed with the Prodigi sandbox');
  if (!config.stripeEnabled && !config.demoPayments) throw new Error('Set STRIPE_SECRET_KEY (or DEMO_PAYMENTS=1 for sandbox demos)');
  return config;
}

export const randomId = (bytes = 10) => crypto.randomBytes(bytes).toString('hex');
