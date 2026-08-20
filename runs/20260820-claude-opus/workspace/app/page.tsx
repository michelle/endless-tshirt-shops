import Store from '@/components/Store';
import Masthead from '@/components/Masthead';

export default function Home() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const isTestMode = publishableKey.startsWith('pk_test_');

  return (
    <main className="page">
      <Masthead />

      {isTestMode && (
        <div className="test-banner">
          <strong>Test mode.</strong> No real money moves. Pay with card{' '}
          <code>4242 4242 4242 4242</code>, any future expiry, any CVC, any ZIP. Orders are sent to
          Scalable Press in test mode and are not physically printed.
        </div>
      )}

      <Store publishableKey={publishableKey} />

      <footer className="footer">
        <span>
          A rebuild of{' '}
          <a href="https://github.com/michelle/dt-shirt" rel="noreferrer noopener">
            datetime.store
          </a>
          . Printed on demand by Scalable Press, paid through Stripe.
        </span>
        <span>One shirt, one millisecond, never again.</span>
      </footer>
    </main>
  );
}
