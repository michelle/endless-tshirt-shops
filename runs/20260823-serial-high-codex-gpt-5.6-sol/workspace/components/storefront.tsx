"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowIcon, CheckIcon, LockIcon } from "./icons";
import { ShirtPreview } from "./shirt-preview";

type Fit = "fitted" | "unisex";
type Size = "S" | "M" | "L" | "XL";

export function Storefront({ initialTimestamp }: { initialTimestamp: number }) {
  const [fit, setFit] = useState<Fit>("fitted");
  const [size, setSize] = useState<Size>("M");
  const [timestamp, setTimestamp] = useState(initialTimestamp);
  const [heldTimestamp, setHeldTimestamp] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      if (heldTimestamp === null) setTimestamp(Date.now());
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [heldTimestamp]);

  const buy = async () => {
    const exactMoment = Date.now();
    setTimestamp(exactMoment);
    setHeldTimestamp(exactMoment);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fit, size, timestamp: exactMoment }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be started.");
      window.location.assign(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setHeldTimestamp(null);
      setLoading(false);
    }
  };

  return (
    <main>
      <header className="site-header shell">
        <a className="wordmark" href="#top" aria-label="datetime.store home">
          datetime<span>.store</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#story">How it works</a>
          <a href="#details">Details</a>
        </nav>
        <a className="header-buy" href="#buy">Buy the moment <ArrowIcon /></a>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>DROP 001</span> MADE WHEN YOU ARE</p>
          <h1>This moment<br />won’t last.</h1>
          <p className="hero-lede">So we’ll print it on a shirt.</p>
        </div>
        <div className="hero-note">
          <span className="note-line" />
          <p>Every tee is printed with the exact Unix timestamp from the instant you press buy. No two are alike.</p>
        </div>
      </section>

      <section className="product shell" id="buy" aria-label="Customize your timestamp tee">
        <ShirtPreview fit={fit} timestamp={heldTimestamp ?? timestamp} paused={heldTimestamp !== null} />

        <div className="product-panel">
          <div className="product-heading">
            <div>
              <p className="mini-label">THE TIMESTAMP TEE</p>
              <h2>Wear right now.</h2>
            </div>
            <div className="price">
              <span className="old-price">$30</span>
              <strong>$22.50</strong>
            </div>
          </div>

          <p className="product-description">A soft black cotton tee, made on demand and typeset with your one-of-one millisecond timestamp.</p>

          <fieldset>
            <legend><span>01</span> Choose your fit</legend>
            <div className="choice-grid two">
              {(["fitted", "unisex"] as Fit[]).map((option) => (
                <button key={option} type="button" className={fit === option ? "selected" : ""} onClick={() => setFit(option)} aria-pressed={fit === option}>
                  <span>{option === "fitted" ? "Fitted" : "Unisex"}</span>
                  {fit === option && <CheckIcon />}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend><span>02</span> Choose your size</legend>
            <div className="choice-grid four">
              {(["S", "M", "L", "XL"] as Size[]).map((option) => (
                <button key={option} type="button" className={size === option ? "selected" : ""} onClick={() => setSize(option)} aria-pressed={size === option}>{option}</button>
              ))}
            </div>
          </fieldset>

          <div className="moment-box">
            <span>Your timestamp</span>
            <code>{heldTimestamp ?? timestamp}</code>
            <small>Captured again at checkout</small>
          </div>

          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="buy-button" type="button" onClick={buy} disabled={loading}>
            <span>{loading ? "Holding your moment…" : "Capture this moment"}</span>
            {!loading && <><span className="buy-price">$22.50</span><ArrowIcon /></>}
          </button>
          <p className="secure-note"><LockIcon /> Secure checkout by Stripe · Free US shipping</p>
        </div>
      </section>

      <section className="story shell" id="story">
        <div className="story-title">
          <p className="eyebrow"><span>THE IDEA</span> TIME, MATERIALIZED</p>
          <h2>A receipt for<br />being here.</h2>
        </div>
        <div className="steps">
          <article><span>01</span><h3>You press buy.</h3><p>We freeze the millisecond—thirteen digits that belong only to your order.</p></article>
          <article><span>02</span><h3>We print it.</h3><p>Your timestamp is typeset in white and printed to order on a black cotton tee.</p></article>
          <article><span>03</span><h3>Time moves on.</h3><p>Your shirt doesn’t. It arrives as a permanent record of one very specific now.</p></article>
        </div>
      </section>

      <section className="details shell" id="details">
        <div>
          <p className="mini-label">PRODUCT NOTES</p>
          <h2>Built to outlast<br />the moment.</h2>
        </div>
        <dl>
          <div><dt>Material</dt><dd>100% cotton</dd></div>
          <div><dt>Print</dt><dd>Direct-to-garment, front</dd></div>
          <div><dt>Fit</dt><dd>Fitted or unisex</dd></div>
          <div><dt>Care</dt><dd>Cold wash, inside out</dd></div>
          <div><dt>Shipping</dt><dd>Free in the United States</dd></div>
          <div><dt>Production</dt><dd>Made to order · typically 5–9 days</dd></div>
        </dl>
      </section>

      <footer className="site-footer shell">
        <div className="footer-mark">datetime<span>.store</span></div>
        <p>We sell a t-shirt with the current datetime.</p>
        <div className="footer-links"><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="mailto:hello@datetime.store">Contact</a></div>
        <small>© {new Date().getFullYear()} datetime.store</small>
      </footer>
    </main>
  );
}
