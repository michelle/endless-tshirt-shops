import { Store } from '@/components/Store';
import { isLiveMode } from '@/lib/stripe';
import { prodigiEnv } from '@/lib/prodigi';

// The shirt has to be stamped with the time you loaded the page, not the time
// this bundle was built.
export const dynamic = 'force-dynamic';

export default function Page() {
  const testMode = !isLiveMode();

  return (
    <>
      <main className="shell">
        <header className="masthead">
          <h1>datetime.store</h1>
          <p>
            we sell a t-shirt with the current datetime.{' '}
            <span className="clockmark" aria-hidden="true">
              ⏱
            </span>
          </p>
        </header>
        <Store initialMs={Date.now()} />
      </main>
      <footer className="footer">
        <span>
          Printed on demand and shipped worldwide by Prodigi. Payments by Stripe.
        </span>
        {testMode ? (
          <span className="testbadge">
            Test mode — Stripe test, Prodigi {prodigiEnv()}. Use card 4242 4242 4242 4242.
          </span>
        ) : null}
      </footer>
    </>
  );
}
