import { json } from '@/lib/server';
export function GET() {
  return json({
    store: 'AFTER HOURS',
    paymentsConfigured: Boolean(
      process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
    ),
    printingConfigured: Boolean(process.env.PRODIGI_API_KEY),
    mode: process.env.PRODIGI_ENV === 'live' ? 'live' : 'sandbox',
  });
}
