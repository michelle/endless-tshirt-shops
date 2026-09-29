import Store from './store';
export const dynamic = 'force-dynamic';
export default function Page() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  const paired = (key.startsWith('sk_test_') && process.env.PRODIGI_ENV !== 'live') || (key.startsWith('sk_live_') && process.env.PRODIGI_ENV === 'live');
  const checkoutReady = Boolean(paired && process.env.STRIPE_WEBHOOK_SECRET && process.env.PRODIGI_API_KEY);
  return <Store checkoutReady={checkoutReady}/>;
}
