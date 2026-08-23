"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, ClockIcon } from "./icons";
import { ShirtPreview } from "./shirt-preview";
import { SHIRT_SIZES, SHIRT_STYLES, type ShirtSize, type ShirtStyle } from "@/lib/product";

export function Storefront({ initialTimestamp }: { initialTimestamp: number }) {
  const [timestamp, setTimestamp] = useState(initialTimestamp);
  const [style, setStyle] = useState<ShirtStyle>("fitted");
  const [size, setSize] = useState<ShirtSize>("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const interval = window.setInterval(() => setTimestamp(Date.now()), 43);
    return () => window.clearInterval(interval);
  }, []);

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "long" }).format(timestamp),
    [timestamp],
  );

  async function checkout() {
    setLoading(true);
    setError("");
    const capturedAt = Date.now();
    setTimestamp(capturedAt);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, capturedAt }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be started.");
      window.location.assign(payload.url);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="datetime.store home">datetime<span>.</span>store</a>
        <div className="edition"><span className="status-dot" /> MADE TO ORDER · EDITION ∞</div>
      </header>

      <section className="hero" id="top">
        <div className="product-visual">
          <div className="eyebrow"><ClockIcon /> THE EXACT MOMENT, PRINTED</div>
          <ShirtPreview style={style} timestamp={timestamp} />
        </div>

        <div className="product-copy">
          <p className="kicker">A T-SHIRT FOR RIGHT NOW</p>
          <h1>This moment.<br />On a shirt.<br /><em>Forever.</em></h1>
          <p className="lede">Your exact checkout timestamp, screen printed in white on a premium black tee. No two are ever the same.</p>

          <div className="timestamp-card">
            <div>
              <span className="micro-label">YOUR TIMESTAMP</span>
              <strong>{timestamp}</strong>
            </div>
            <span className="live-pill"><i /> LIVE</span>
            <small>{dateLabel}</small>
          </div>

          <fieldset>
            <legend>01 — CHOOSE YOUR CUT</legend>
            <div className="option-grid two">
              {SHIRT_STYLES.map((option) => (
                <label className={style === option.value ? "selected" : ""} key={option.value}>
                  <input type="radio" name="style" value={option.value} checked={style === option.value} onChange={() => setStyle(option.value)} />
                  <span>{option.label}<small>{option.description}</small></span><b>✓</b>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>02 — SELECT SIZE <a href="#size-guide">SIZE GUIDE</a></legend>
            <div className="option-grid sizes">
              {SHIRT_SIZES.map((option) => (
                <label className={size === option ? "selected" : ""} key={option}>
                  <input type="radio" name="size" value={option} checked={size === option} onChange={() => setSize(option)} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="purchase-row">
            <div className="price"><span>$30.00</span><strong>$22.50</strong><small>USD · FREE U.S. SHIPPING</small></div>
            <button className="buy-button" type="button" onClick={checkout} disabled={loading}>
              {loading ? "RESERVING YOUR MOMENT…" : "CAPTURE THIS MOMENT"}<ArrowIcon />
            </button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="secure-note">SECURE CHECKOUT BY STRIPE · PRINTED ON DEMAND</p>
        </div>
      </section>

      <section className="manifesto">
        <p>13 digits. One instant.</p>
        <h2>A small monument<br />to a passing second.</h2>
        <div className="features">
          <div><span>01</span><strong>EXACT</strong><p>The timestamp freezes the millisecond you begin checkout.</p></div>
          <div><span>02</span><strong>UNIQUE</strong><p>Every shirt records a different point in time.</p></div>
          <div><span>03</span><strong>ON DEMAND</strong><p>Printed only after you order. Less waste, more meaning.</p></div>
        </div>
      </section>

      <section className="size-guide" id="size-guide">
        <div><p className="kicker">THE RIGHT FIT</p><h2>Size guide</h2><p>Premium combed cotton. Fitted has a closer silhouette; unisex is straight and easy.</p></div>
        <table><thead><tr><th>SIZE</th><th>CHEST</th><th>LENGTH</th></tr></thead><tbody>
          <tr><td>S</td><td>35–38 in</td><td>28 in</td></tr><tr><td>M</td><td>38–41 in</td><td>29 in</td></tr><tr><td>L</td><td>41–44 in</td><td>30 in</td></tr><tr><td>XL</td><td>44–48 in</td><td>31 in</td></tr>
        </tbody></table>
      </section>

      <footer><a className="wordmark" href="#top">datetime<span>.</span>store</a><p>© {new Date().getFullYear()} · A VERY SMALL SHOP ABOUT A VERY BIG THING.</p><div><span>FREE U.S. SHIPPING</span><span>MADE TO ORDER</span></div></footer>
    </main>
  );
}
