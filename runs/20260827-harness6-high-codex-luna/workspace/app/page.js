"use client";

import { useEffect, useMemo, useState } from "react";

const sizes = ["S", "M", "L", "XL", "2XL"];

function formatTimestamp(value) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(date).toUpperCase(),
    time: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" }).format(date),
    ms: String(date.getUTCMilliseconds()).padStart(3, "0"),
  };
}

function Shirt({ timestamp, style }) {
  const stamp = formatTimestamp(timestamp);
  return (
    <div className={`shirt-stage ${style === "fitted" ? "shirt-stage--fitted" : ""}`} aria-label="Live preview of the datetime t-shirt">
      <div className="shirt-shadow" />
      <svg className="shirt-art" viewBox="0 0 500 590" role="img" aria-label={`${style} black t-shirt preview`}>
        <defs>
          <linearGradient id="shirtBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#252525" />
            <stop offset="0.55" stopColor="#101010" />
            <stop offset="1" stopColor="#050505" />
          </linearGradient>
          <linearGradient id="shirtSleeve" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#1f1f1f" />
            <stop offset="1" stopColor="#090909" />
          </linearGradient>
          <filter id="shirtTexture"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="table" tableValues="0 0.035" /></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply" /></filter>
        </defs>
        <path className="shirt-body" d={style === "fitted" ? "M174 65c10 26 30 39 76 39s66-13 76-39l69 27c14 6 24 18 29 32l18 50-52 38-27-25-14 350H151l-14-350-27 25-52-38 18-50c5-14 15-26 29-32l69-27Z" : "M164 56c17 27 39 43 86 43s69-16 86-43l84 36c13 6 22 17 27 30l17 46-63 49-27-25-9 341H135l-9-341-27 25-63-49 17-46c5-13 14-24 27-30l84-36Z"} fill="url(#shirtBody)" filter="url(#shirtTexture)" />
        <path className="shirt-sleeve" d={style === "fitted" ? "M174 65 105 92c-14 6-24 18-29 32L58 174l52 38 27-25" : "M164 56 80 92c-13 6-22 17-27 30l-17 46 63 49 27-25"} fill="url(#shirtSleeve)" />
        <path className="shirt-sleeve" d={style === "fitted" ? "M326 65l69 27c14 6 24 18 29 32l18 50-52 38-27-25" : "M336 56l84 36c13 6 22 17 27 30l17 46-63 49-27-25"} fill="url(#shirtSleeve)" />
        <path d={style === "fitted" ? "M174 66c11 23 30 38 76 38s65-15 76-38" : "M164 57c17 26 39 42 86 42s69-16 86-42"} fill="none" stroke="#303030" strokeWidth="4" />
        <path d="M250 115v350" stroke="#292929" strokeWidth="2" opacity=".45" />
        <g className="shirt-print" textAnchor="middle">
          <text x="250" y="246">{stamp.date}</text>
          <text x="250" y="280" className="shirt-print__time">{stamp.time}<tspan className="shirt-print__ms">.{stamp.ms}</tspan></text>
          <text x="250" y="310" className="shirt-print__label">UTC / LIVE</text>
        </g>
        <path d="M145 467h210" stroke="#242424" strokeWidth="1" />
      </svg>
      <span className="preview-chip"><span className="pulse-dot" /> updates live</span>
    </div>
  );
}

export default function Home() {
  const [now, setNow] = useState(() => Date.now());
  const [style, setStyle] = useState("fitted");
  const [size, setSize] = useState("M");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 41);
    return () => window.clearInterval(timer);
  }, []);

  const dateLabel = useMemo(() => formatTimestamp(now), [now]);

  async function beginCheckout() {
    setStatus("loading");
    setError("");
    const frozenTimestamp = Date.now();
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, size, timestamp: frozenTimestamp }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout is temporarily unavailable.");
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setStatus("idle");
      setError(checkoutError.message);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="datetime.store home"><span className="wordmark-mark">dt</span><span>datetime.store</span></a>
        <div className="header-note"><span className="tiny-spark">✳</span> made for right now</div>
      </header>

      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">limited edition / 001</p>
          <h1>A shirt for<br /><em>right now.</em></h1>
          <p className="lede">A little time capsule for the present tense. Every tee is printed with the exact datetime you order it — down to the millisecond.</p>
          <div className="live-readout" aria-live="polite">
            <span className="live-readout__label"><span className="pulse-dot pulse-dot--dark" /> your moment, live</span>
            <span className="live-readout__value">{dateLabel.date} <b>{dateLabel.time}<small>.{dateLabel.ms}</small></b> UTC</span>
          </div>
          <div className="hero-details">
            <span><b>$22.50</b> USD</span><i />
            <span>free shipping</span><i />
            <span>printed to order</span>
          </div>
        </div>
        <div className="hero-product">
          <div className="product-kicker"><span>the now tee</span><span>01 / 01</span></div>
          <Shirt timestamp={now} style={style} />
          <div className="product-caption"><span>front / black</span><span>bella + canvas 3001</span></div>
        </div>
      </section>

      <section className="purchase-section" id="order">
        <div className="section-heading"><span className="section-number">01</span><h2>Make it yours</h2><span className="rule" /></div>
        <div className="purchase-grid">
          <div className="choice-block">
            <div className="choice-label">fit <span>choose your silhouette</span></div>
            <div className="choice-buttons">
              <button className={style === "fitted" ? "selected" : ""} onClick={() => setStyle("fitted")}><span className="fit-icon fit-icon--fitted" />Fitted<span className="choice-note">slightly shaped</span></button>
              <button className={style === "unisex" ? "selected" : ""} onClick={() => setStyle("unisex")}><span className="fit-icon fit-icon--unisex" />Unisex<span className="choice-note">classic cut</span></button>
            </div>
            <div className="choice-label size-label">size <span>unisex sizing</span></div>
            <div className="size-buttons">{sizes.map((item) => <button key={item} className={size === item ? "selected" : ""} onClick={() => setSize(item)}>{item}</button>)}</div>
            <a className="size-guide" href="#details">see size guide <span>↗</span></a>
          </div>
          <div className="checkout-card">
            <div className="checkout-card__top"><span>your order</span><span>one / one</span></div>
            <div className="order-line"><div className="mini-shirt"><span>{dateLabel.time}</span></div><div><strong>The Now Tee</strong><span>black / {style === "fitted" ? "fitted" : "unisex"} / {size}</span></div><b>$22.50</b></div>
            <div className="total-line"><span>total <small>shipping included</small></span><strong>$22.50 <small>USD</small></strong></div>
            <button className="buy-button" disabled={status === "loading"} onClick={beginCheckout}>{status === "loading" ? <><span className="spinner" /> opening secure checkout</> : <>get the now tee <span>→</span></>}</button>
            <p className="secure-note"><span>⌁</span> secure checkout via Stripe · printed by Prodigi</p>
            {error && <p className="error-note" role="alert">{error}</p>}
          </div>
        </div>
      </section>

      <section className="details-section" id="details">
        <div className="details-card"><span className="section-number">02</span><h2>Made to<br /><em>hold a moment.</em></h2><p>Soft, heavyweight cotton. A clean front print. No two shirts are ever quite the same.</p></div>
        <div className="specs"><div><span>fabric</span><b>100% combed cotton</b></div><div><span>print</span><b>water-based, full color</b></div><div><span>made by</span><b>Prodigi / on demand</b></div><div><span>ships in</span><b>3–5 business days</b></div></div>
      </section>

      <footer><a className="wordmark" href="/"><span className="wordmark-mark">dt</span><span>datetime.store</span></a><span>keep the moment close.</span><span>© 2026</span></footer>
    </main>
  );
}
