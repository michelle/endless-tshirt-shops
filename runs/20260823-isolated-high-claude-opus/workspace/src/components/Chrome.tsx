import Link from 'next/link';

export function Masthead() {
  return (
    <header className="masthead">
      <h1>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          datetime.store
        </Link>
      </h1>
      <p>we sell a t-shirt with the current datetime. ⏱</p>
    </header>
  );
}

/**
 * A loud, unmissable banner whenever the shop is wired to Stripe test keys.
 * The single worst outcome for a shop like this is quietly running in test mode
 * and thinking the money is real.
 */
export function TestModeBanner({ publishableKey }: { publishableKey: string }) {
  if (!publishableKey.includes('_test_')) return null;
  return (
    <div className="test-banner">
      Test mode — no real card is charged and no real shirt is printed. Use card{' '}
      <strong>4242 4242 4242 4242</strong> with any future expiry and CVC.
    </div>
  );
}

export function StoreFooter() {
  return (
    <footer className="footer">
      <span>Printed on demand in the US by Scalable Press.</span>
      <span>Payments by Stripe.</span>
      <span>Free US shipping.</span>
      <a href="mailto:hello@datetime.store">hello@datetime.store</a>
    </footer>
  );
}
