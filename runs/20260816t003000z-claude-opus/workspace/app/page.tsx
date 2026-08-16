import Store from '@/components/Store';
import { chivo } from './fonts';

// Env-dependent, and the shirt is a live clock — never prerender this to a
// static file.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const testMode = publishableKey.startsWith('pk_test_');
  const dryRun = process.env.SP_SUBMIT_ORDERS !== 'true';

  return (
    <main className="page">
      <header className="masthead">
        <h1>datetime.store</h1>
        <p>
          we sell a t-shirt with the current datetime.
          <span className="clock" aria-hidden="true">
            <ClockGlyph />
          </span>
        </p>
      </header>

      {publishableKey ? (
        <Store
          publishableKey={publishableKey}
          printFontFamily={chivo.style.fontFamily}
          testMode={testMode}
          dryRun={dryRun}
        />
      ) : (
        <div className="alert" role="alert">
          Checkout is not configured. Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>,{' '}
          <code>STRIPE_SECRET_KEY</code> and <code>SP_AUTH</code>, then redeploy.
        </div>
      )}

      <footer className="footer">
        <p>
          Every shirt is printed with the exact millisecond you clicked buy, direct-to-garment at
          300&nbsp;DPI on a black tee, then fulfilled by{' '}
          <a href="https://scalablepress.com" rel="noreferrer noopener" target="_blank">
            Scalable Press
          </a>
          . Payments by{' '}
          <a href="https://stripe.com" rel="noreferrer noopener" target="_blank">
            Stripe
          </a>
          . US shipping only.
        </p>
        <p>
          A rebuild of the original{' '}
          <a
            href="https://github.com/michelle/dt-shirt"
            rel="noreferrer noopener"
            target="_blank"
          >
            datetime.store
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

function ClockGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <circle cx="8" cy="8" r="6.6" strokeWidth="1.4" />
      <path d="M8 4.3V8.3L10.6 9.9" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
