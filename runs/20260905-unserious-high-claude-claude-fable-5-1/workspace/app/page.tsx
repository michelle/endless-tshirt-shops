import { Store } from "./components/Store";
import { Faq } from "./components/Faq";
import { LiveClock } from "./components/LiveClock";

export default function Home() {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "";
  const testMode = publishableKey.startsWith("pk_test_");

  return (
    <main className="page">
      <header className="page-header">
        <h1>datetime.store</h1>
        <h2>we sell a t-shirt with the current datetime. ⏱</h2>
        {testMode ? (
          <div className="test-pill">
            test mode: nothing is really charged. try card <code>4242 4242 4242 4242</code>, any future
            expiry, any CVC.
          </div>
        ) : null}
      </header>

      <Store publishableKey={publishableKey} />

      <Faq supportEmail={process.env.SUPPORT_EMAIL} />

      <footer className="footer">
        <span>
          © 1970–<LiveClock className="num" /> datetime.store. All milliseconds reserved.
        </span>
        <span>Powered by Stripe, Prodigi, and the relentless forward march of time.</span>
      </footer>
    </main>
  );
}
