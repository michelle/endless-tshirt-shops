"use client";

import { useEffect, useRef, useState } from "react";

const FITS = [
  { id: "fitted", label: "Fitted", detail: "Bella + Canvas 6004" },
  { id: "unisex", label: "Unisex", detail: "Bella + Canvas 3001" },
] as const;

const SIZES = ["S", "M", "L", "XL"] as const;

export default function Shop({ initialTimestamp, sandbox }: { initialTimestamp: number; sandbox: boolean }) {
  const [fit, setFit] = useState<(typeof FITS)[number]["id"]>("fitted");
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [timestamp, setTimestamp] = useState(initialTimestamp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const frozenTimestamp = useRef(initialTimestamp);

  useEffect(() => {
    if (loading) return;
    const timer = window.setInterval(() => setTimestamp(Date.now()), 31);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function checkout() {
    setLoading(true);
    setError("");
    frozenTimestamp.current = Date.now();
    setTimestamp(frozenTimestamp.current);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fit, size, timestamp: frozenTimestamp.current }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout is unavailable.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout is unavailable.");
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="masthead">
        <a className="brand" href="/" aria-label="datetime.store home">datetime.store</a>
        <p className="tagline">One moment. One shirt. Yours forever.</p>
        <span className="sandbox-chip"><span aria-hidden="true" />{sandbox ? "SANDBOX SHOP" : "LIVE SHOP"}</span>
      </header>

      <section className="product-grid" aria-labelledby="product-title">
        <div className="product-stage">
          <div className="stage-topline">
            <span>LIVE EDITION</span>
            <span>DT—001</span>
          </div>
          <div className={`shirt-preview ${fit}`} aria-label={`${fit} black t-shirt preview with timestamp ${timestamp}`}>
            <div className="shirt-sleeve left" /><div className="shirt-sleeve right" />
            <div className="shirt-body">
              <div className="collar" />
              <span className="shirt-timestamp">{timestamp}</span>
            </div>
          </div>
          <p className="caption">Your print updates live. It freezes when you continue to checkout.</p>
          <div className="price-tag"><s>$30</s><strong>$22.50</strong></div>
        </div>

        <div className="purchase-panel">
          <div className="panel-content">
            <p className="eyebrow">YOUR TIMESTAMP</p>
            <h1 id="product-title">Wear this<br />exact moment.</h1>
            <p className="lede">A premium black tee printed with the exact Unix millisecond you commit to it. No reruns. No restocks. No two are alike.</p>

            <fieldset className="option-group">
              <legend><span>01</span> Choose your fit</legend>
              <div className="fit-options">
                {FITS.map((option) => (
                  <label key={option.id} className={fit === option.id ? "selected" : ""}>
                    <input type="radio" name="fit" value={option.id} checked={fit === option.id} onChange={() => setFit(option.id)} />
                    <span className="option-title">{option.label}<i aria-hidden="true" /></span>
                    <small>{option.detail}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="option-group size-group">
              <legend><span>02</span> Choose your size</legend>
              <div className="size-options">
                {SIZES.map((option) => (
                  <label key={option} className={size === option ? "selected" : ""}>
                    <input type="radio" name="size" value={option} checked={size === option} onChange={() => setSize(option)} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <p className="size-note">Standard US sizing · Pre-shrunk cotton</p>
            </fieldset>

            {error && <p className="checkout-error" role="alert">{error}</p>}
            <button className="checkout-button" type="button" disabled={loading} onClick={checkout}>
              <span>{loading ? "Freezing your moment…" : "Freeze this moment"}</span>
              <span className="button-price">{loading ? timestamp : "$22.50 →"}</span>
            </button>
            <div className="assurances" aria-label="Purchase details">
              <span>Free shipping</span><span>Secure Stripe checkout</span><span>Printed on demand</span>
            </div>
          </div>
        </div>
      </section>

      <section className="story-strip" aria-label="How it works">
        <p><span>THE IDEA</span> Time is always moving. Your shirt captures one unrepeatable point in it.</p>
        <ol>
          <li><b>1</b><span>Watch time move</span></li>
          <li><b>2</b><span>Freeze your millisecond</span></li>
          <li><b>3</b><span>We print & ship it</span></li>
        </ol>
      </section>
      <footer><span>© {new Date().getFullYear()} datetime.store</span><span>{sandbox ? "Sandbox rebuild · Payments and fulfillment are test-only" : "Secure checkout · Printed on demand"}</span></footer>
    </main>
  );
}
