import { loadConfig } from './src/config.js';
import { openDb } from './src/db.js';
import { createProdigi } from './src/prodigi.js';
import { createStripeProvider, createDemoProvider } from './src/payments.js';
import { createOrderService } from './src/orders.js';
import { createApp } from './src/app.js';

const config = loadConfig();
const db = openDb(config.dataDir);
const prodigi = createProdigi({ baseUrl: config.prodigiBaseUrl, apiKey: config.prodigiApiKey, shippingMethod: config.shippingMethod });
const payments = config.stripeEnabled
  ? createStripeProvider({ secretKey: config.stripeSecretKey, webhookSecret: config.stripeWebhookSecret, baseUrl: config.baseUrl })
  : createDemoProvider({ baseUrl: config.baseUrl });
const orders = createOrderService({ db, config, prodigi, payments });
const app = createApp({ config, orders, prodigi, payments });

app.listen(config.port, () => {
  console.log(`Orrery store on :${config.port}  base=${config.baseUrl}`);
  console.log(`  payments: ${payments.name}${config.stripeEnabled ? (config.stripeIsTestMode ? ' (TEST mode)' : ' (LIVE)') : ' (demo, no real money)'}`);
  console.log(`  prodigi:  ${config.prodigiIsSandbox ? 'SANDBOX' : 'LIVE'} ${config.prodigiBaseUrl}`);
  if (/localhost|127\.0\.0\.1/.test(config.baseUrl)) console.warn('  WARNING: BASE_URL is local; Prodigi cannot download print files from it.');
});

setInterval(() => orders.reconcile().catch((e) => console.error('[reconcile]', e.message)), 30e3).unref();
setTimeout(() => orders.reconcile().catch((e) => console.error('[reconcile]', e.message)), 3e3).unref();
