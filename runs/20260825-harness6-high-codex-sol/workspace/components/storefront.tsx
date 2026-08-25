"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowIcon, CheckIcon, ClockIcon } from "./icons";
import { ShirtPreview } from "./shirt-preview";
import { SHIRT_STYLES, SIZES, type ShirtSize, type ShirtStyle } from "@/lib/catalog";

export function Storefront() {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isCheckingOut) return;
    const timer = window.setInterval(() => setTimestamp(Date.now()), 37);
    return () => window.clearInterval(timer);
  }, [isCheckingOut]);

  async function beginCheckout() {
    const captured = Date.now();
    setTimestamp(captured);
    setIsCheckingOut(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: captured, style, size }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be started.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setIsCheckingOut(false);
    }
  }

  return (
    <main>
      <header className="site-header shell">
        <Link className="wordmark" href="/" aria-label="datetime.store home">
          datetime<span>.store</span>
        </Link>
        <div className="header-note"><ClockIcon size={16} /> Made at this very moment</div>
      </header>

      <section className="hero shell">
        <div className="intro">
          <p className="eyebrow">A timestamp you can wear</p>
          <h1>We sell a t-shirt with the <em>current datetime.</em></h1>
          <p className="lede">Pick your fit, pick your size, then capture the exact millisecond that becomes your one-of-one shirt.</p>
        </div>

        <div className="shop-grid">
          <ShirtPreview timestamp={timestamp} style={style} frozen={isCheckingOut} />

          <div className="buy-panel">
            <div className="buy-heading">
              <div>
                <p className="product-kicker">The datetime tee</p>
                <h2>Your moment, in type.</h2>
              </div>
              <div className="price"><s>$30</s><strong>$22.50</strong></div>
            </div>

            <div className="control-group">
              <div className="control-label"><span>01</span><legend>Choose your fit</legend></div>
              <div className="segmented segmented--two">
                {SHIRT_STYLES.map((option) => (
                  <label key={option.value} className={style === option.value ? "choice active" : "choice"}>
                    <input type="radio" name="style" value={option.value} checked={style === option.value} onChange={() => setStyle(option.value)} disabled={isCheckingOut} />
                    <span>{option.label}<small>{option.description}</small></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="control-group">
              <div className="control-label"><span>02</span><legend>Choose your size</legend></div>
              <div className="segmented segmented--sizes">
                {SIZES.map((option) => (
                  <label key={option} className={size === option ? "choice active" : "choice"}>
                    <input type="radio" name="size" value={option} checked={size === option} onChange={() => setSize(option)} disabled={isCheckingOut} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <p className="size-note">True to size · soft ringspun cotton · unisex sizing runs slightly relaxed</p>
            </div>

            <button className="checkout-button" type="button" onClick={beginCheckout} disabled={isCheckingOut}>
              <span>{isCheckingOut ? "Capturing your moment…" : "Capture this moment"}</span>
              {isCheckingOut ? <span className="spinner" aria-hidden="true" /> : <ArrowIcon />}
            </button>
            {error && <p className="form-error" role="alert">{error}</p>}

            <div className="assurances">
              <span><CheckIcon size={16} /> Free shipping</span>
              <span><CheckIcon size={16} /> Secure Stripe checkout</span>
              <span><CheckIcon size={16} /> Printed on demand</span>
            </div>
          </div>
        </div>
      </section>

      <section className="story">
        <div className="shell story-grid">
          <p className="story-index">WHY 13 DIGITS?</p>
          <div>
            <h2>It’s not just a number.<br />It’s when it all happened.</h2>
            <p>Unix time counts every millisecond since January 1, 1970. Your tee preserves the split second you committed—an ordinary moment made permanently yours.</p>
          </div>
          <div className="sample-stamp" aria-hidden="true">
            <span>1704067200000</span>
            <small>JAN 01 2024 · 00:00:00.000 UTC</small>
          </div>
        </div>
      </section>

      <footer className="site-footer shell">
        <span>datetime.store</span>
        <span>Made one moment at a time.</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
