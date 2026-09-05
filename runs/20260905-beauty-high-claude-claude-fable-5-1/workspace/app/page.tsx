import Link from "next/link";
import Store from "@/components/Store";
import Ticker from "@/components/Ticker";
import { prodigiIsSandbox } from "@/lib/prodigi";
import { formatPrice, PRICE_CENTS } from "@/lib/catalog";

export default function Home() {
  const sandbox = prodigiIsSandbox() || (process.env.STRIPE_SECRET_KEY || "").includes("test");
  return (
    <>
      <header className="wrap header">
        <Link href="/" className="wordmark">
          <span className="wordmark-name">
            datetime<em>.</em>store
          </span>
          <span className="wordmark-est">est. 1970</span>
        </Link>
        <nav className="nav">
          <a href="#how">How it works</a>
          <a href="#faq">Questions</a>
        </nav>
      </header>

      <main className="wrap">
        <h1 className="hero-title">
          We sell a t-shirt with the <em>current</em> datetime.
        </h1>
        <p className="hero-sub">
          Not a date. Not a time. The exact millisecond you decide to buy it, printed across the chest. Every shirt is
          the only one of its kind, because time doesn&apos;t repeat.
        </p>

        <Store />
        <Ticker />

        <section id="how" className="section">
          <h2>
            How it <em>works</em>
          </h2>
          <div className="steps">
            <article className="step">
              <h3>Time passes.</h3>
              <p>It&apos;s been doing this since 1 January 1970, 00:00:00 UTC. The shirt counts along in milliseconds.</p>
            </article>
            <article className="step">
              <h3>You press the button.</h3>
              <p>The number freezes. That&apos;s your moment. Pick a cut, a colour and a size, then pay. Or let it go and wait for a better one.</p>
            </article>
            <article className="step">
              <h3>We print exactly that.</h3>
              <p>
                Your 13 digits go onto a Bella + Canvas tee, printed and shipped by Prodigi, for {formatPrice(PRICE_CENTS)} with free
                shipping. Nobody else will ever get the same number.
              </p>
            </article>
          </div>
        </section>

        <section id="faq" className="section">
          <h2>
            Reasonable <em>questions</em>
          </h2>
          <div className="faq">
            <details>
              <summary>What am I actually buying?</summary>
              <p>
                A t-shirt printed with a Unix timestamp in milliseconds: the number of milliseconds that had elapsed since
                the epoch when you pressed &ldquo;Freeze this moment&rdquo;. It&apos;s a wearable receipt for a point in
                time.
              </p>
            </details>
            <details>
              <summary>Which moment gets printed?</summary>
              <p>
                The one your screen showed when you froze it. We double-check it against our own clock and, if it&apos;s
                wildly off, we use ours. You see the exact digits again before you pay and on your receipt.
              </p>
            </details>
            <details>
              <summary>Is it really unique?</summary>
              <p>
                Yes. Two people would have to press the button in the same millisecond, and then we&apos;d still only
                print one of them first. We&apos;ve decided that counts.
              </p>
            </details>
            <details>
              <summary>What&apos;s the shirt like?</summary>
              <p>
                Unisex is a Bella + Canvas 3001, 100% ring-spun cotton, classic relaxed fit. Fitted is a Bella + Canvas
                6004, a slimmer cut in soft 60/40 cotton-poly. Both come in black with white ink or white with black ink,
                sizes S to 2XL. The digits print about 8.5 inches wide, a few inches below the collar.
              </p>
            </details>
            <details>
              <summary>Where do you ship?</summary>
              <p>
                Free standard shipping to the US, Canada, UK, Ireland, Australia, New Zealand, most of Europe, Japan,
                Singapore, Hong Kong, South Korea, Mexico and Brazil. Expect 5–14 business days including printing.
              </p>
            </details>
            <details>
              <summary>Can I return it?</summary>
              <p>
                Every shirt is made to order for a moment that only you own, so we can&apos;t resell it. If it arrives
                damaged or misprinted, reply to your receipt and we&apos;ll make it right.
              </p>
            </details>
            <details>
              <summary>Why is it on sale?</summary>
              <p>Time is always on sale. Nobody has ever paid full price for it.</p>
            </details>
          </div>
        </section>
      </main>

      <footer className="wrap footer">
        <span className="serif">Time is a flat circle. Shirts are not.</span>
        <span>
          Payments by Stripe · Printing by Prodigi · Since {new Date().getFullYear()}{" "}
          {sandbox && <span className="pill warn">test mode · no real charges, no real shirts</span>}
        </span>
      </footer>
    </>
  );
}
