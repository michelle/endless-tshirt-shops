import { config } from '@/lib/config.js';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    ok: true,
    prodigi: config.prodigiKey ? (config.prodigiSandbox ? 'sandbox' : 'live') : 'missing-key',
    payments: config.stripeEnabled ? 'stripe' : config.demoPayments ? 'demo' : 'unconfigured',
    stripeWebhook: !!config.stripeWebhookSecret,
  });
}
