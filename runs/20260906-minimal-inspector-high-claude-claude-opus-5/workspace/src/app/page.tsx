import Store from '@/components/Store';
import { optionalEnv } from '@/lib/env';
import { prodigiEnvironment } from '@/lib/prodigi';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const publishableKey = optionalEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') ?? '';
  const testMode = !publishableKey.startsWith('pk_live_');

  return (
    <main className="page">
      <header className="masthead">
        <h1 className="wordmark">datetime.store</h1>
        <p className="tagline">
          we sell a t-shirt with the current datetime.
          <ClockGlyph />
        </p>
      </header>

      <Store publishableKey={publishableKey} testMode={testMode} />

      <footer className="footer">
        <span>
          Printed on demand by Prodigi ({prodigiEnvironment()}). Payments by Stripe
          {testMode ? ' (test mode)' : ''}.
        </span>
        <span>
          A rebuild of{' '}
          <a href="https://github.com/michelle/datetime.store" rel="noreferrer noopener" target="_blank">
            michelle/datetime.store
          </a>
        </span>
      </footer>
    </main>
  );
}

function ClockGlyph() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 5.2V10l3.2 2.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
