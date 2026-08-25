"use client";

import { useEffect, useMemo, useState } from "react";

type Fit = "unisex" | "fitted";
type Size = "S" | "M" | "L" | "XL";

const sizes: Size[] = ["S", "M", "L", "XL"];

function formatMoment(timestamp: number) {
  const date = new Date(timestamp);
  const calendar = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
  const clock = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
  }).format(date);
  return { calendar, clock };
}

function ShirtPreview({ timestamp, fit }: { timestamp: number; fit: Fit }) {
  const value = String(timestamp);
  const path =
    fit === "fitted"
      ? "M252 75C218 91 183 99 139 115L45 249l87 61 43-58c4 89-7 183-34 260 69 24 150 24 219 0-26-76-37-171-33-260l43 58 87-61-94-134c-45-16-80-24-114-40-9 33-32 50-49 50s-40-17-48-50Z"
      : "M250 74c-24 24-76 24-100 0L91 99 17 224l93 61 48-68-8 302c66 20 134 20 200 0l-8-302 48 68 93-61-74-125-59-25c-14 40-36 53-50 53s-36-13-50-53Z";

  return (
    <div className="product-stage" aria-label={`Black ${fit} T-shirt preview printed with ${value}`}>
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <svg className="shirt" viewBox="0 0 500 600" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#242420" />
            <stop offset=".5" stopColor="#0f0f0e" />
            <stop offset="1" stopColor="#292925" />
          </linearGradient>
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodOpacity=".25" />
          </filter>
          <filter id="texture">
            <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" result="noise" />
            <feComposite in="noise" in2="SourceGraphic" operator="in" result="texture" />
            <feBlend in="SourceGraphic" in2="texture" mode="soft-light" />
          </filter>
        </defs>
        <g filter="url(#shadow)">
          <path d={path} fill="url(#fabric)" filter="url(#texture)" />
          <path d="M205 78c7 32 25 49 45 49s38-17 45-49c-17-10-29-17-45-17s-28 7-45 17Z" fill="#090908" />
          <path d="M216 76c7 20 19 30 34 30s27-10 34-30c-12-5-22-8-34-8s-22 3-34 8Z" fill="#f2f0e9" opacity=".92" />
        </g>
        <text x="250" y="206" textAnchor="middle" fill="white" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="27" fontWeight="600" letterSpacing="1">{value}</text>
        <text x="250" y="236" textAnchor="middle" fill="white" opacity=".46" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="7" letterSpacing="2.4">UNIX TIME · MILLISECONDS</text>
      </svg>
      <span className="preview-note">Live preview</span>
    </div>
  );
}

export function Storefront() {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  const [fit, setFit] = useState<Fit>("unisex");
  const [size, setSize] = useState<Size>("M");
  const [loading, setLoading] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [error, setError] = useState("");
  const isSandbox = process.env.NEXT_PUBLIC_COMMERCE_MODE !== "live";

  useEffect(() => {
    if (frozen) return;
    const timer = window.setInterval(() => setTimestamp(Date.now()), 37);
    return () => window.clearInterval(timer);
  }, [frozen]);

  const formatted = useMemo(() => formatMoment(timestamp), [timestamp]);

  async function beginCheckout() {
    const capturedAt = Date.now();
    setTimestamp(capturedAt);
    setFrozen(true);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fit, size, timestamp: capturedAt })
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout could not be started.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setFrozen(false);
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="datetime.store home">
          <span className="mark-dot" />datetime.store
        </a>
        <p>{isSandbox ? "Sandbox preview · Test cards only" : "Made once. Yours forever."}</p>
      </header>

      <section className="hero" id="top">
        <div className="visual-column">
          <div className="eyebrow"><span>01</span> The exact-time tee</div>
          <ShirtPreview timestamp={timestamp} fit={fit} />
          <div className="moment-caption" aria-live="polite">
            <span>{formatted.calendar}</span>
            <span>{formatted.clock}</span>
          </div>
        </div>

        <div className="buy-column">
          <p className="kicker">A timestamp you can wear</p>
          <h1>This moment.<br /><em>Printed.</em></h1>
          <p className="lede">
            One black tee, printed on demand with the exact millisecond you choose to make it yours.
          </p>

          <div className="price-row">
            <span className="price">$22.50</span>
            <span className="price-note">Free standard shipping<br />US delivery only</span>
          </div>

          <fieldset>
            <legend><span>1</span> Choose a fit</legend>
            <div className="choice-grid fit-grid">
              <label className={fit === "unisex" ? "selected" : ""}>
                <input type="radio" name="fit" value="unisex" checked={fit === "unisex"} onChange={() => setFit("unisex")} />
                <strong>Unisex</strong><small>Relaxed, true to size</small>
              </label>
              <label className={fit === "fitted" ? "selected" : ""}>
                <input type="radio" name="fit" value="fitted" checked={fit === "fitted"} onChange={() => setFit("fitted")} />
                <strong>Fitted</strong><small>Closer cut, size up for ease</small>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend><span>2</span> Choose a size</legend>
            <div className="choice-grid size-grid">
              {sizes.map((value) => (
                <label className={size === value ? "selected" : ""} key={value}>
                  <input type="radio" name="size" value={value} checked={size === value} onChange={() => setSize(value)} />
                  <strong>{value}</strong>
                </label>
              ))}
            </div>
          </fieldset>

          <button className="checkout-button" type="button" onClick={beginCheckout} disabled={loading}>
            <span>{loading ? "Opening secure checkout…" : "Capture this moment"}</span>
            <span aria-hidden="true">↗</span>
          </button>
          <p className="capture-note">Your timestamp is frozen when you click. Secure checkout by Stripe.</p>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
      </section>

      <section className="details" aria-label="Product details">
        <div><span>01</span><h2>What gets printed?</h2><p>The 13-digit Unix timestamp for the exact millisecond you captured—white ink on a black tee.</p></div>
        <div><span>02</span><h2>Made to order</h2><p>Printed with water-based inks on a soft crew-neck shirt, then shipped directly to you.</p></div>
        <div><span>03</span><h2>The material</h2><p>Premium cotton construction. Machine wash cold, inside out; tumble dry low.</p></div>
      </section>

      <footer>
        <a className="wordmark" href="#top"><span className="mark-dot" />datetime.store</a>
        <p>A tiny monument to right now.</p>
        <p>© {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
