"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  Clock3,
  Leaf,
  Minus,
  PackageCheck,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const SIZES = ["S", "M", "L", "XL", "2XL"] as const;

function readableTime(timestamp: number) {
  if (!timestamp) return "waiting for the present…";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function ShirtPreview({ timestamp, compact = false }: { timestamp: number; compact?: boolean }) {
  const iso = timestamp ? new Date(timestamp).toISOString() : "····-··-··T··:··:··.···Z";

  return (
    <div className={`shirt-wrap ${compact ? "shirt-wrap-compact" : ""}`}>
      <Image src="/gildan-black.webp" width={2000} height={2000} preload={!compact} alt="Black cotton T-shirt with a live timestamp preview" />
      <div className="shirt-print" aria-live="off">
        <small>YOUR MOMENT</small>
        <strong suppressHydrationWarning>{timestamp || "·············"}</strong>
        <em suppressHydrationWarning>{iso}</em>
      </div>
    </div>
  );
}

export default function Home() {
  const [now, setNow] = useState(0);
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [quantity, setQuantity] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 37);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const displayTime = frozenAt ?? now;
  const price = useMemo(() => 36 * quantity, [quantity]);

  function scrollToAtelier() {
    document.querySelector("#atelier")?.scrollIntoView({ behavior: "smooth" });
  }

  function freezeMoment() {
    setFrozenAt(Date.now());
    setError("");
  }

  async function beginCheckout() {
    if (!frozenAt) return;
    setCheckingOut(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: frozenAt, size, quantity, color: "black" }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be started.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Something went sideways. Please try again.");
      setCheckingOut(false);
    }
  }

  return (
    <main>
      <nav className="site-nav" aria-label="Main navigation">
        <a className="wordmark" href="#top" aria-label="datetime.store home">
          <span>datetime</span><i>.store</i>
        </a>
        <div className="nav-links">
          <a href="#story">The idea</a>
          <a href="#details">Details</a>
          <button onClick={scrollToAtelier}>Make yours <ArrowRight size={15} /></button>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="product-stage" aria-label="Live shirt preview">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="twinkle twinkle-one">✦</span>
          <span className="twinkle twinkle-two">✦</span>
          <ShirtPreview timestamp={now} />
          <span className="stage-sticker">LIVE<br />PREVIEW</span>
          <div className="live-chip"><span /> updating now</div>
        </div>

        <div className="intro">
          <p className="eyebrow"><span /> The world&apos;s most current T-shirt</p>
          <h1>Wear this<br /><em>exact</em> moment.</h1>
          <p className="lede">
            A tiny slice of forever, printed in milliseconds on satisfyingly substantial cotton.
            Your timestamp freezes the instant you choose it.
          </p>
          <div className="buy-row">
            <button type="button" onClick={scrollToAtelier}>Choose your moment <ArrowDown size={18} /></button>
            <p><b>$36</b><small>U.S. shipping included</small></p>
          </div>
          <div className="trust-row" aria-label="Product highlights">
            <span><Sparkles size={15} /> Printed just for you</span>
            <span><Leaf size={15} /> 100% U.S. cotton</span>
            <span><PackageCheck size={15} /> Plastic-free packing</span>
          </div>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div>
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index}>THE PRESENT LOOKS GOOD ON YOU <i>✦</i></span>
          ))}
        </div>
      </div>

      <section className="story" id="story">
        <div className="section-kicker">01 / The idea</div>
        <div className="story-copy">
          <h2>Time flies.<br />This one doesn&apos;t.</h2>
          <p>
            Pick a moment. We translate it into Unix time—the quiet little number computers use
            to keep the world in sync—and print it exactly once, just for you.
          </p>
        </div>
        <div className="moment-card">
          <Clock3 size={26} />
          <small>13 digits, infinite meaning</small>
          <strong suppressHydrationWarning>{now || "·············"}</strong>
          <p>Every millisecond is a limited edition.</p>
        </div>
      </section>

      <section className="atelier" id="atelier">
        <div className="atelier-head">
          <div>
            <div className="section-kicker light">02 / Your moment</div>
            <h2>Make time<br /><em>tangible.</em></h2>
          </div>
          <p>Three small decisions. One wildly specific shirt.</p>
        </div>

        <div className="builder">
          <div className="builder-preview">
            <div className="preview-orbit" />
            <ShirtPreview timestamp={displayTime} compact />
            <div className={`preview-status ${frozenAt ? "is-frozen" : ""}`}>
              <span /> {frozenAt ? "moment captured" : "live · still ticking"}
            </div>
          </div>

          <div className="builder-controls">
            <div className="control-step">
              <div className="step-heading"><span>1</span><div><small>THE MOMENT</small><strong>Freeze the clock</strong></div></div>
              <div className="time-capsule">
                <div>
                  <strong suppressHydrationWarning>{displayTime || "·············"}</strong>
                  <small suppressHydrationWarning>{readableTime(displayTime)}</small>
                </div>
                {frozenAt ? (
                  <button className="icon-button" type="button" onClick={() => setFrozenAt(null)} aria-label="Release and choose a new moment">
                    <RefreshCcw size={18} />
                  </button>
                ) : (
                  <span className="recording-dot" aria-label="Live timestamp" />
                )}
              </div>
              <button className={`freeze-button ${frozenAt ? "captured" : ""}`} type="button" onClick={freezeMoment}>
                {frozenAt ? <><Check size={18} /> Captured! Freeze another</> : <><Clock3 size={18} /> Freeze this moment</>}
              </button>
            </div>

            <div className="control-step">
              <div className="step-heading"><span>2</span><div><small>THE FIT</small><strong>Choose your size</strong></div></div>
              <div className="size-grid" role="radiogroup" aria-label="T-shirt size">
                {SIZES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={size === option}
                    className={size === option ? "selected" : ""}
                    onClick={() => setSize(option)}
                  >{option}</button>
                ))}
              </div>
              <details className="size-guide">
                <summary>Size guide</summary>
                <p>S 18″ · M 20″ · L 22″ · XL 24″ · 2XL 26″ — chest width, laid flat. Classic unisex fit.</p>
              </details>
            </div>

            <div className="control-step last-step">
              <div className="step-heading"><span>3</span><div><small>THE COUNT</small><strong>How many?</strong></div></div>
              <div className="quantity-row">
                <div className="quantity-control">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity === 1} aria-label="Decrease quantity"><Minus size={17} /></button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity(Math.min(5, quantity + 1))} disabled={quantity === 5} aria-label="Increase quantity"><Plus size={17} /></button>
                </div>
                <p><b>${price}</b><small>shipping included</small></p>
              </div>
            </div>

            {error && <p className="checkout-error" role="alert">{error}</p>}
            <button className="checkout-button" type="button" disabled={!frozenAt || checkingOut} onClick={beginCheckout}>
              <span>{checkingOut ? "Opening secure checkout…" : frozenAt ? "Make this moment wearable" : "Freeze a moment to continue"}</span>
              <ArrowRight size={20} />
            </button>
            <p className="secure-note"><ShieldCheck size={15} /> Secure test checkout by Stripe · fulfilled in the Prodigi sandbox</p>
          </div>
        </div>
      </section>

      <section className="details" id="details">
        <div className="section-kicker">03 / Good to know</div>
        <div className="detail-grid">
          <article><span>01</span><Sparkles /><h3>Printed for one</h3><p>Your exact timestamp is rendered as a crisp, one-off direct-to-garment print.</p></article>
          <article><span>02</span><Leaf /><h3>Made thoughtfully</h3><p>Substantial pre-shrunk cotton, water-based inks, and plastic-free packing.</p></article>
          <article><span>03</span><PackageCheck /><h3>Near, not far</h3><p>Prodigi routes each shirt to an appropriate print lab close to its destination.</p></article>
        </div>
        <div className="faq-row">
          <h2>Questions from<br />the future.</h2>
          <div>
            <details><summary>What exactly gets printed?<Plus size={18} /></summary><p>Your chosen 13-digit Unix timestamp, its matching UTC datetime, and a tiny datetime.store signature.</p></details>
            <details><summary>When does my moment freeze?<Plus size={18} /></summary><p>The button press captures it down to the millisecond. It stays fixed while you choose your size and check out.</p></details>
            <details><summary>How is the shirt made?<Plus size={18} /></summary><p>It is printed on demand on a black Gildan 2000 classic-fit tee using direct-to-garment printing.</p></details>
            <details><summary>Where can this demo ship?<Plus size={18} /></summary><p>This test storefront currently accepts U.S. shipping addresses only. Production and delivery generally take about one to two weeks.</p></details>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <a className="wordmark footer-mark" href="#top"><span>datetime</span><i>.store</i></a>
          <p>Souvenirs from the present tense.</p>
        </div>
        <button type="button" onClick={scrollToAtelier}>Catch a moment <ArrowRight size={16} /></button>
        <small>© {new Date().getFullYear()} · TIME WELL WORN</small>
      </footer>
    </main>
  );
}
