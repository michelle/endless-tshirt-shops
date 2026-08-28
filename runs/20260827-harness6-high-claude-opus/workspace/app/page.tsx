import Store from '@/components/Store';
import { isStripeTestMode } from '@/lib/stripe';
import { isProdigiSandbox } from '@/lib/prodigi';

export const dynamic = 'force-dynamic';

export default function Home() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
  const testMode = isStripeTestMode() || isProdigiSandbox();

  return (
    <>
      <header className="masthead">
        <div className="shell">
          <h1>
            datetime<b>.store</b>
          </h1>
          <p>
            we sell a t-shirt with the current datetime.
            <span className="clock" aria-hidden>
              ⏱
            </span>
          </p>
        </div>
      </header>

      <main className="shell">
        <Store publishableKey={publishableKey} />

        <section className="faq">
          <div>
            <h3>What actually gets printed?</h3>
            <p>
              The Unix timestamp in milliseconds — the number ticking on the shirt above. It stops
              the instant you press buy, and that exact number is what goes to the press. Nobody
              else will ever have it.
            </p>
          </div>
          <div>
            <h3>How is it made?</h3>
            <p>
              Direct-to-garment on a black Gildan Softstyle tee, printed and shipped on demand by
              Prodigi. Nothing is stocked, so nothing is wasted.
            </p>
          </div>
          <div>
            <h3>Shipping &amp; returns</h3>
            <p>
              Free standard shipping inside the US, usually 5–10 business days. Each shirt is unique
              to the millisecond you picked, so we can&rsquo;t take returns — but if it arrives wrong
              or damaged, reply to your receipt and we&rsquo;ll reprint it.
            </p>
          </div>
        </section>
      </main>

      <footer className="shell footer">
        <span>© datetime.store — one product, infinite variants.</span>
        <span>
          {testMode && <span className="badge-test">test mode · no real charges</span>}
        </span>
      </footer>
    </>
  );
}
