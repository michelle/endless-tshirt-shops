"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const sizes = ["S", "M", "L", "XL"] as const;
const fits = [
  { id: "fitted", label: "Fitted", detail: "Women’s cut" },
  { id: "unisex", label: "Unisex", detail: "Classic cut" },
] as const;

type Fit = (typeof fits)[number]["id"];
type Size = (typeof sizes)[number];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path d="M5 12h13M13 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ShirtPreview({ fit, timestamp, frozen }: { fit: Fit; timestamp: number; frozen: boolean }) {
  const path =
    fit === "fitted"
      ? "M79.312 15.149C77.683 13.518 63.195 9.003 63.195 9.003S58.885 17.724 51.535 17.724 39.875 9.003 39.875 9.003 24.521 13.939 23.389 15.071C22.259 16.201 9.677 32.063 9.677 32.063l10.081 8.37 6.614-5.518s14.411 23.971 1.384 58.875c0 0 43.546 10.767 47.434 0-9.689-43.26 1.379-58.613 1.379-58.613l6.267 5.228 9.35-11.117S80.945 16.781 79.312 15.149Z"
      : "M79.313 6.142C77.683 4.511 63.196 4 63.196 4S53.352 17.724 51.535 17.724C49.719 17.724 39.875 4 39.875 4S24.521 4.932 23.389 6.064C22.259 7.194.562 30.954.562 30.954L16.71 42.975l9.662-8.06 1.384 58.875s43.541 10.705 47.433 0l1.379-58.613 9.347 7.797L100 30.953S80.945 7.774 79.313 6.142Z";

  return (
    <div className="preview-card" aria-label={`Black ${fit} t-shirt preview showing timestamp ${timestamp}`}>
      <div className={`live-indicator ${frozen ? "frozen" : ""}`}>
        <span aria-hidden="true" />
        {frozen ? "Moment held" : "Live now"}
      </div>
      <div className="shirt-wrap">
        <svg className="shirt" viewBox="0 0 101 104" role="img" aria-label={`Black ${fit} t-shirt`}>
          <path d={path} fill="currentColor" />
        </svg>
        <output className="shirt-time" aria-live="off">{timestamp}</output>
      </div>
      <div className="preview-caption">
        <span>UNIX TIME</span>
        <span>MILLISECONDS</span>
      </div>
    </div>
  );
}

export default function Storefront({ checkoutCancelled = false }: { checkoutCancelled?: boolean }) {
  const [fit, setFit] = useState<Fit>("fitted");
  const [size, setSize] = useState<Size>("M");
  const [timestamp, setTimestamp] = useState(() => Date.now());
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(checkoutCancelled ? "Checkout cancelled. Your moment is live again." : "");
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (!frozen) setTimestamp(Date.now());
      raf.current = requestAnimationFrame(update);
    };
    raf.current = requestAnimationFrame(update);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [frozen]);

  async function checkout() {
    const capturedAt = Date.now();
    setTimestamp(capturedAt);
    setFrozen(true);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fit, size, timestamp: capturedAt }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not start.");
      window.location.assign(data.url);
    } catch (checkoutError) {
      setFrozen(false);
      setLoading(false);
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not start.");
    }
  }

  return (
    <main>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="datetime.store home">datetime.store</Link>
        <p>WE SELL A T-SHIRT WITH THE CURRENT DATETIME <span aria-hidden="true">◷</span></p>
      </header>

      <section className="store-grid">
        <ShirtPreview fit={fit} timestamp={timestamp} frozen={frozen} />

        <div className="buy-panel">
          <div className="eyebrow">ONE MOMENT. ONE SHIRT.</div>
          <h1>This exact moment,<br />on a t-shirt.</h1>
          <p className="intro">The number keeps moving until you buy. Then it’s yours forever, printed in white on black.</p>

          <div className="price-line">
            <span className="price">$22.50</span>
            <s>$30.00</s>
            <span className="shipping">FREE US SHIPPING</span>
          </div>

          <fieldset>
            <legend>Fit</legend>
            <div className="fit-options">
              {fits.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={fit === option.id ? "selected" : ""}
                  aria-pressed={fit === option.id}
                  disabled={loading}
                  onClick={() => setFit(option.id)}
                >
                  <span>{option.label}</span>
                  <small>{option.detail}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <div className="legend-row"><legend>Size</legend><span>True to size</span></div>
            <div className="size-options">
              {sizes.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={size === option ? "selected" : ""}
                  aria-pressed={size === option}
                  disabled={loading}
                  onClick={() => setSize(option)}
                >{option}</button>
              ))}
            </div>
          </fieldset>

          <div className="moment-readout">
            <div>
              <span className="readout-label">YOUR DATETIME</span>
              <strong>{timestamp}</strong>
            </div>
            <span className={frozen ? "status-frozen" : "status-live"}>{frozen ? "HELD" : "LIVE"}</span>
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <button className="checkout-button" type="button" onClick={checkout} disabled={loading}>
            <span>{loading ? "Holding your moment…" : "Buy this moment"}</span>
            {!loading && <ArrowIcon />}
          </button>
          <p className="secure-note"><LockIcon /> Secure checkout by Stripe</p>

          <details>
            <summary>What exactly gets printed?</summary>
            <p>Your 13-digit Unix timestamp—the number of milliseconds since January 1, 1970—is frozen when you press the button.</p>
          </details>
        </div>
      </section>

      <footer>
        <p>Printed to order in the USA by Prodigi.</p>
        <p className="test-mode"><span /> TEST MODE — NO REAL CHARGES OR SHIPMENTS</p>
      </footer>
    </main>
  );
}
