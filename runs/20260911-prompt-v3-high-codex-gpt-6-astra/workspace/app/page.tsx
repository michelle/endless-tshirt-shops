import Store from './store';
export const dynamic = 'force-dynamic';
export default function Home() {
  return (
    <Store
      paymentReady={Boolean(
        process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
      )}
      sandbox={process.env.PRODIGI_ENV !== 'live'}
      supportEmail={process.env.SUPPORT_EMAIL || ''}
    />
  );
}
